import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { copyFileSync, createReadStream, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { resolve, dirname, extname, join, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { WebSocketServer, WebSocket } from "ws";
import { EventStore, HttpError, fail } from "./store.mjs";
import { readEventConfig } from "./event-config.mjs";
import { startPartnerFeed } from "./partner-feed.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ORIGINS = [
  "http://localhost:5189", "http://127.0.0.1:5189",
  "http://localhost:5173", "http://127.0.0.1:5173",
];
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml",
  ".glb": "model/gltf-binary", ".gltf": "model/gltf+json", ".spz": "application/octet-stream",
  ".ply": "application/octet-stream", ".splat": "application/octet-stream",
  ".woff2": "font/woff2", ".mp4": "video/mp4", ".mp3": "audio/mpeg", ".wav": "audio/wav",
  ".ico": "image/x-icon", ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".md": "text/markdown; charset=utf-8", ".srt": "application/x-subrip; charset=utf-8", ".vtt": "text/vtt; charset=utf-8",
};
function token(req) {
  const auth = req.headers.authorization || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : "";
}
const TOKEN_SHAPE = /^[A-Za-z0-9_-]{40,100}$/;
// Content-hashed build output or a ?v= cache-busted asset never changes under its URL.
const VERSIONED = /\/assets\/(?:.+\/)?[^/]+-[A-Za-z0-9_-]{8,}\.[a-z0-9]+$/i;
function cacheControl(pathname, url, extension) {
  if (extension === ".html") return "no-cache";
  return VERSIONED.test(pathname) || url.searchParams.has("v") ? "public, max-age=31536000, immutable" : "public, max-age=3600";
}
function notModified(req, etag, mtime) {
  const match = req.headers["if-none-match"];
  if (match) return match.split(",").some(value => value.trim() === etag || value.trim() === "*");
  const since = Date.parse(req.headers["if-modified-since"] || "");
  return Number.isFinite(since) && Math.floor(mtime / 1000) * 1000 <= since;
}
async function readBody(req) {
  if (!String(req.headers["content-type"] || "").toLowerCase().startsWith("application/json")) fail(415, "JSON_REQUIRED", "请使用 JSON 提交资料");
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 8192) fail(413, "BODY_TOO_LARGE", "提交内容过大");
    chunks.push(chunk);
  }
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!body || typeof body !== "object" || Array.isArray(body)) fail(400, "INVALID_JSON", "需要 JSON 对象");
    return body;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    fail(400, "INVALID_JSON", "JSON 格式不正确");
  }
}
function json(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(JSON.stringify(payload));
}

export function createEventServer({
  dataFile = resolve(HERE, "data/event.json"),
  distDir = resolve(HERE, "../dist"),
  allowedOrigins = (process.env.ECHO_ALLOWED_ORIGINS || "").split(",").map(v => v.trim()).filter(Boolean),
  now = () => Date.now(),
  // Venue Wi-Fi puts many phones behind one NAT address; join allows a queue
  // of arrivals per minute without opening unbounded writes.
  rateLimit = { read: 600, write: 120, join: 60, windowMs: 60000 },
  eventConfig = {},
  tapSecret = "",
  trustProxy = false,
  maxAttendees = 1200,
  // Live phones and screens at once; beyond it a phone reads /api/changes every 10 s.
  maxSockets = 2000,
  // Changes within this window go out as one message (0: each at once).
  broadcastMs = 0,
  // Disk writes coalesced over this window (0: every change written at once).
  persistDelayMs = 0,
  // { url, token, label, source, intervalMs }: partner members on the map (server/partner-feed.mjs).
  partnerFeed = null,
  // { dir, intervalMs, keep }: rolling copies of the data file during the event.
  backup = null,
  log = message => console.warn(message),
} = {}) {
  const origins = new Set([...DEFAULT_ORIGINS, ...allowedOrigins]);
  // Only the first full snapshot is large enough to compress; per-change messages stay small and plain.
  const sockets = new WebSocketServer({
    noServer: true, maxPayload: 1024,
    perMessageDeflate: { threshold: 4096, serverNoContextTakeover: true, clientNoContextTakeover: true, zlibDeflateOptions: { level: 5 }, concurrencyLimit: 8 },
  });
  const limitBuckets = new Map();
  let pending = [], touchedIds = new Set(), flushTimer = null, lastFlush = 0;
  function flush() {
    flushTimer = null; lastFlush = Date.now();
    const entries = pending, touched = touchedIds;
    pending = []; touchedIds = new Set();
    if (entries.length) {
      const message = JSON.stringify({ type: "changes", version: store.state.version, entries });
      for (const client of sockets.clients) {
        if (client.readyState !== WebSocket.OPEN) continue;
        // A phone that cannot keep up reconnects and starts from a fresh snapshot.
        if (client.bufferedAmount > 1024 * 1024) client.close(1013, "Slow consumer");
        else client.send(message);
      }
    }
    if (touched.size) for (const client of sockets.clients) if (client.readyState === WebSocket.OPEN && touched.has(client.attendeeId)) client.send('{"type":"me"}');
  }
  const store = new EventStore({
    file: dataFile, now, eventConfig, maxAttendees, persistDelayMs,
    onChange(entry, touched) {
      pending.push(entry);
      for (const id of touched) touchedIds.add(id);
      if (flushTimer) return;
      const wait = broadcastMs - (Date.now() - lastFlush);
      if (wait <= 0) flush(); else flushTimer = setTimeout(flush, wait);
    },
  });
  const feed = partnerFeed?.url ? startPartnerFeed({ store, log, ...partnerFeed }) : null;
  let backupTimer = null;
  if (backup?.dir && dataFile) {
    backupTimer = setInterval(() => {
      try {
        store.flush();
        if (!existsSync(dataFile)) return;
        mkdirSync(backup.dir, { recursive: true, mode: 0o700 });
        copyFileSync(dataFile, join(backup.dir, "event-" + new Date().toISOString().replace(/[:.]/g, "-") + ".json"));
        const copies = readdirSync(backup.dir).filter(name => /^event-.+\.json$/.test(name)).sort();
        for (const name of copies.slice(0, Math.max(0, copies.length - (backup.keep || 96)))) unlinkSync(join(backup.dir, name));
      } catch (error) { log("[echo-campus] backup failed: " + error.message); }
    }, backup.intervalMs || 300000);
    backupTimer.unref();
  }
  function allowedOrigin(origin) { return !origin || origins.has(origin); }
  function clientAddress(req) {
    // Only a trusted reverse proxy may name the client; otherwise every guest
    // behind Nginx would share one limit bucket (or could spoof another's).
    if (trustProxy) {
      const real = String(req.headers["x-real-ip"] || "").trim() || String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
      if (real) return real;
    }
    return req.socket.remoteAddress || "unknown";
  }
  // A signed-in phone counts against its own session; anonymous requests share
  // their address, which at a venue is the whole Wi-Fi, so they get ipFactor
  // times the allowance. Join is always per address (it is how sessions start).
  function rate(req, kind) {
    const session = kind !== "join" && TOKEN_SHAPE.test(token(req)) ? createHash("sha256").update(token(req)).digest("base64url").slice(0, 22) : "";
    const key = (session ? "s:" + session : clientAddress(req)) + ":" + kind;
    const allowance = session || kind === "join" ? rateLimit[kind] : rateLimit[kind] * (rateLimit.ipFactor ?? 5);
    const moment = now();
    let bucket = limitBuckets.get(key);
    if (!bucket || moment >= bucket.until) {
      bucket = { count: 0, until: moment + rateLimit.windowMs };
      limitBuckets.set(key, bucket);
    }
    if (++bucket.count > allowance) fail(429, "RATE_LIMITED", "操作较频繁，请稍后重试");
    if (limitBuckets.size > 20000) {
      for (const [k,v] of limitBuckets) if (moment >= v.until) limitBuckets.delete(k);
      if (limitBuckets.size > 20000) limitBuckets.delete(limitBuckets.keys().next().value);
    }
  }
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://echo.local");
      if (url.pathname.startsWith("/api/")) {
        if (!allowedOrigin(req.headers.origin)) fail(403, "ORIGIN_NOT_ALLOWED", "此来源未开放活动接口");
        if (req.headers.origin) {
          res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
          res.setHeader("Vary", "Origin");
        }
        if (req.method === "OPTIONS") {
          res.writeHead(204, { "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization" });
          return res.end();
        }
        rate(req, req.method === "GET" ? "read" : url.pathname === "/api/join" ? "join" : "write");
        if (req.method === "GET" && url.pathname === "/api/health") return json(res, 200, {
          ok: true, service: "echo-campus-event", mode: store.state.event.demoMode ? "demo" : "event", version: store.state.version,
          attendees: store.state.attendees.length, live: sockets.clients.size, remote: feed ? { ...feed.status } : null,
          uptime: Math.round(process.uptime()), memoryMb: Math.round(process.memoryUsage().rss / 1048576),
          cpuMs: Math.round((process.cpuUsage().user + process.cpuUsage().system) / 1000),
        });
        if (req.method === "GET" && url.pathname === "/api/event") {
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
          return res.end(store.snapshotJson());
        }
        if (req.method === "GET" && url.pathname === "/api/changes") return json(res, 200, store.changesSince(url.searchParams.get("since")));
        if (req.method === "GET" && url.pathname === "/api/me") return json(res, 200, store.me(token(req)));
        if (req.method === "GET" && url.pathname === "/api/matches") return json(res, 200, store.matches(token(req)));
        if (req.method === "GET" && url.pathname === "/api/activity") return json(res, 200, store.activitySnapshot());
        if (req.method === "POST" && url.pathname === "/api/checkins") {
          const body = await readBody(req);
          const checkpointId = typeof body.checkpointId === "string" ? body.checkpointId : "";
          return json(res, 200, store.checkin(token(req), checkpointId));
        }
        if (req.method === "POST" && url.pathname === "/api/join") {
          const result = store.join(await readBody(req), token(req));
          return json(res, result.resumed ? 200 : 201, result);
        }
        if (req.method === "POST" && url.pathname === "/api/encounters") {
          const result = store.requestEncounter(token(req), await readBody(req));
          return json(res, result.idempotent ? 200 : 201, result);
        }
        const confirm = url.pathname.match(/^\/api\/encounters\/(enc-[a-f0-9-]+)\/confirm$/);
        if (req.method === "POST" && confirm) return json(res, 200, store.confirmEncounter(token(req), confirm[1]));
        const decline = url.pathname.match(/^\/api\/encounters\/(enc-[a-f0-9-]+)\/decline$/);
        if (req.method === "POST" && decline) return json(res, 200, store.declineEncounter(token(req), decline[1]));
        if (req.method === "POST" && url.pathname === "/api/tap") return json(res, 200, store.tap(token(req), await readBody(req), { secret: tapSecret }));
        if (req.method === "POST" && url.pathname === "/api/leave") return json(res, 200, store.leave(token(req)));
        if (url.pathname === "/api/live") fail(426, "WEBSOCKET_REQUIRED", "请使用 WebSocket 连接");
        fail(404, "NOT_FOUND", "接口不存在");
      }
      if (req.method !== "GET" && req.method !== "HEAD") fail(405, "METHOD_NOT_ALLOWED", "不支持此请求方式");
      let pathname;
      try { pathname = decodeURIComponent(url.pathname); } catch { fail(400, "INVALID_PATH", "路径无效"); }
      if (pathname.includes("\\") || pathname.includes("\0") || pathname.split("/").some(p => p.startsWith("."))) fail(404, "NOT_FOUND", "页面不存在");
      const root = resolve(distDir);
      let file = resolve(root, "." + pathname);
      if (file !== root && !file.startsWith(root + sep)) fail(404, "NOT_FOUND", "页面不存在");
      if (existsSync(file) && statSync(file).isDirectory()) file = resolve(file, "index.html");
      if (!existsSync(file) && !extname(pathname)) file = resolve(root, "index.html");
      if (!existsSync(file) || !statSync(file).isFile()) fail(404, "NOT_FOUND", "页面尚未构建或资源不存在");
      const extension = extname(file).toLowerCase();
      const type = MIME[extension] || "application/octet-stream";
      // Serve an offline gzip sibling for lossless mesh geometry. Byte ranges
      // remain relative to the original file; no runtime compression work.
      const acceptsGzip = String(req.headers["accept-encoding"] || "").split(",").some(part => {
        const [name, ...parameters] = part.trim().toLowerCase().split(";");
        const q = parameters.find(p => p.trim().startsWith("q="));
        return name === "gzip" && (!q || Number(q.trim().slice(2)) > 0);
      });
      const compressed = extension === ".glb" && !req.headers.range && acceptsGzip && existsSync(file + ".gz") && statSync(file + ".gz").isFile();
      if (compressed) file += ".gz";
      const stat = statSync(file);
      // A validator per served file (the gzip sibling has its own), so a reopened page costs a 304, not the venue again.
      const etag = `W/"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
      const headers = {
        "Content-Type": type, "X-Content-Type-Options": "nosniff",
        "Cache-Control": cacheControl(pathname, url, extension),
        ETag: etag, "Last-Modified": stat.mtime.toUTCString(),
        ...(extension === ".glb" ? {"Vary":"Accept-Encoding"} : {}),
        ...(compressed ? {"Content-Encoding":"gzip"} : {}),
        "Accept-Ranges": "bytes", "Referrer-Policy": "same-origin",
      };
      if (!req.headers.range && notModified(req, etag, stat.mtimeMs)) {
        res.writeHead(304, { ETag: etag, "Last-Modified": headers["Last-Modified"], "Cache-Control": headers["Cache-Control"], ...(headers.Vary ? { Vary: headers.Vary } : {}) });
        return res.end();
      }
      let start = 0, end = stat.size - 1, status = 200;
      if (req.headers.range) {
        const match = String(req.headers.range).match(/^bytes=(\d*)-(\d*)$/);
        if (!match || (!match[1] && !match[2])) {
          res.writeHead(416, { "Content-Range": "bytes */" + stat.size }); return res.end();
        }
        if (match[1]) {
          start = Number(match[1]); end = match[2] ? Number(match[2]) : end;
        } else {
          start = Math.max(0, stat.size - Number(match[2]));
        }
        end = Math.min(end, stat.size - 1);
        if (start < 0 || start > end || start >= stat.size) {
          res.writeHead(416, { "Content-Range": "bytes */" + stat.size }); return res.end();
        }
        status = 206;
        headers["Content-Range"] = "bytes " + start + "-" + end + "/" + stat.size;
      }
      headers["Content-Length"] = stat.size ? end - start + 1 : 0;
      res.writeHead(status, headers);
      if (req.method === "HEAD" || !stat.size) return res.end();
      createReadStream(file, { start, end }).on("error", () => res.destroy()).pipe(res);
    } catch (error) {
      if (res.headersSent) return res.destroy();
      if (error instanceof HttpError) return json(res, error.status, { error: { code: error.code, message: error.message } });
      console.error("[echo-campus] request failed:", error.name);
      return json(res, 500, { error: { code: "INTERNAL_ERROR", message: "活动服务暂时不可用，请稍后重试" } });
    }
  });
  server.headersTimeout = 15000;
  server.requestTimeout = 15000;
  server.on("upgrade", (req, socket, head) => {
    try {
      const url = new URL(req.url, "http://echo.local");
      if (url.pathname !== "/api/live" || !allowedOrigin(req.headers.origin)) {
        socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n"); socket.destroy(); return;
      }
      rate(req, "read");
      if (sockets.clients.size >= maxSockets) {
        socket.write("HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n"); socket.destroy(); return;
      }
      sockets.handleUpgrade(req, socket, head, ws => sockets.emit("connection", ws, req));
    } catch {
      socket.write("HTTP/1.1 429 Too Many Requests\r\nConnection: close\r\n\r\n"); socket.destroy();
    }
  });
  sockets.on("connection", ws => {
    ws.isAlive = true;
    ws.attendeeId = null;
    let auths = 0;
    ws.on("pong", () => { ws.isAlive = true; });
    ws.on("error", () => {});
    // Read-only: the only message a phone may send names its session, so the
    // server can tell it when its own inbox or passport changed. Mutations use HTTP.
    ws.on("message", raw => {
      let message = null;
      try { message = JSON.parse(raw.toString()); } catch {}
      if (message?.type !== "auth" || typeof message.token !== "string" || ++auths > 5) return ws.close(1008, "Read-only event stream");
      ws.attendeeId = store.authenticate(message.token, false)?.id || null;
    });
    ws.send('{"type":"snapshot",' + store.snapshotJson().slice(1));
  });
  const heartbeat = setInterval(() => {
    for (const ws of sockets.clients) {
      if (!ws.isAlive) ws.terminate();
      else { ws.isAlive = false; ws.ping(); }
    }
  }, 25000);
  heartbeat.unref();
  return {
    server, store, sockets,
    async listen(port = 5189, host = "127.0.0.1") {
      await new Promise((resolvePromise, reject) => {
        server.once("error", reject);
        server.listen(port, host, () => { server.off("error", reject); resolvePromise(); });
      });
      return server.address();
    },
    feed, flush,
    async close() {
      clearInterval(heartbeat);
      clearInterval(backupTimer);
      feed?.stop();
      if (flushTimer) { clearTimeout(flushTimer); flush(); }
      store.flush();
      for (const ws of sockets.clients) ws.terminate();
      await new Promise(resolvePromise => sockets.close(resolvePromise));
      if (server.listening) await new Promise(resolvePromise => server.close(resolvePromise));
    },
  };
}
const entry = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href;
if (entry === import.meta.url) {
  const limit = (name, fallback) => { const value = Number(process.env[name]); return Number.isInteger(value) && value > 0 ? value : fallback; };
  const env = process.env;
  const dataFile = env.ECHO_EVENT_DATA ? resolve(env.ECHO_EVENT_DATA) : resolve(HERE, "data/event.json");
  const app = createEventServer({
    dataFile,
    distDir: env.ECHO_DIST_DIR ? resolve(env.ECHO_DIST_DIR) : resolve(HERE, "../dist"),
    eventConfig: readEventConfig(env.ECHO_EVENT_CONFIG ? resolve(env.ECHO_EVENT_CONFIG) : ""),
    tapSecret: env.ECHO_TAP_SECRET || "",
    trustProxy: env.ECHO_TRUST_PROXY === "1",
    maxAttendees: limit("ECHO_MAX_ATTENDEES", 1200),
    maxSockets: limit("ECHO_MAX_SOCKETS", 2000),
    broadcastMs: limit("ECHO_BROADCAST_MS", 1000),
    persistDelayMs: limit("ECHO_PERSIST_DELAY_MS", 400),
    // Venue Wi-Fi: hundreds of arrivals share one address within minutes.
    rateLimit: { read: limit("ECHO_RATE_READ", 600), write: limit("ECHO_RATE_WRITE", 120), join: limit("ECHO_RATE_JOIN", 600), ipFactor: limit("ECHO_RATE_IP_FACTOR", 5), windowMs: 60000 },
    partnerFeed: env.ECHO_PARTNER_FEED_URL ? {
      url: env.ECHO_PARTNER_FEED_URL, token: env.ECHO_PARTNER_FEED_TOKEN || "", label: env.ECHO_PARTNER_FEED_LABEL || "合作伙伴",
      source: env.ECHO_PARTNER_FEED_SOURCE || "partner", intervalMs: limit("ECHO_PARTNER_FEED_INTERVAL_MS", 60000),
    } : null,
    backup: env.ECHO_BACKUP_DIR ? { dir: resolve(env.ECHO_BACKUP_DIR), intervalMs: limit("ECHO_BACKUP_MS", 300000), keep: limit("ECHO_BACKUP_KEEP", 96) } : null,
  });
  const host = process.env.HOST || "127.0.0.1";
  const port = Number(process.env.PORT || 5189);
  const address = await app.listen(port, host);
  console.log("[echo-campus] DEMO event service listening on http://" + host + ":" + address.port);
  for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, async () => { await app.close(); process.exit(0); });
}
