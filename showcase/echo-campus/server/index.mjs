import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { resolve, dirname, extname, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { WebSocketServer, WebSocket } from "ws";
import { EventStore, HttpError, fail } from "./store.mjs";

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
};
function token(req) {
  const auth = req.headers.authorization || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : "";
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
  rateLimit = { read: 240, write: 40, join: 12, windowMs: 60000 },
} = {}) {
  const origins = new Set([...DEFAULT_ORIGINS, ...allowedOrigins]);
  const sockets = new WebSocketServer({ noServer: true, maxPayload: 1024, perMessageDeflate: false });
  const limitBuckets = new Map();
  const store = new EventStore({
    file: dataFile, now,
    onChange(snapshot) {
      const message = JSON.stringify({ type: "snapshot", ...snapshot });
      for (const client of sockets.clients) {
        if (client.readyState === WebSocket.OPEN) {
          if (client.bufferedAmount > 1024 * 1024) client.close(1013, "Slow consumer");
          else client.send(message);
        }
      }
    },
  });
  function allowedOrigin(origin) { return !origin || origins.has(origin); }
  function rate(req, kind) {
    const key = (req.socket.remoteAddress || "unknown") + ":" + kind;
    const moment = now();
    let bucket = limitBuckets.get(key);
    if (!bucket || moment >= bucket.until) {
      bucket = { count: 0, until: moment + rateLimit.windowMs };
      limitBuckets.set(key, bucket);
    }
    if (++bucket.count > rateLimit[kind]) fail(429, "RATE_LIMITED", "操作较频繁，请稍后重试");
    if (limitBuckets.size > 5000) {
      for (const [k,v] of limitBuckets) if (moment >= v.until) limitBuckets.delete(k);
      if (limitBuckets.size > 5000) limitBuckets.delete(limitBuckets.keys().next().value);
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
        if (req.method === "GET" && url.pathname === "/api/health") return json(res, 200, { ok: true, service: "echo-campus-event", mode: "demo", version: store.state.version });
        if (req.method === "GET" && url.pathname === "/api/event") return json(res, 200, store.snapshot());
        if (req.method === "GET" && url.pathname === "/api/me") return json(res, 200, store.me(token(req)));
        if (req.method === "GET" && url.pathname === "/api/matches") return json(res, 200, store.matches(token(req)));
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
      const stat = statSync(file);
      const type = MIME[extname(file).toLowerCase()] || "application/octet-stream";
      const headers = {
        "Content-Type": type, "X-Content-Type-Options": "nosniff",
        "Cache-Control": extname(file) === ".html" ? "no-cache" : "public, max-age=3600",
        "Accept-Ranges": "bytes", "Referrer-Policy": "same-origin",
      };
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
      if (sockets.clients.size >= 100) {
        socket.write("HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n"); socket.destroy(); return;
      }
      sockets.handleUpgrade(req, socket, head, ws => sockets.emit("connection", ws, req));
    } catch {
      socket.write("HTTP/1.1 429 Too Many Requests\r\nConnection: close\r\n\r\n"); socket.destroy();
    }
  });
  sockets.on("connection", ws => {
    ws.isAlive = true;
    ws.on("pong", () => { ws.isAlive = true; });
    ws.on("error", () => {});
    // Client has no mutation channel; authenticated mutations use HTTP only.
    ws.on("message", () => ws.close(1008, "Read-only event stream"));
    ws.send(JSON.stringify({ type: "snapshot", ...store.snapshot() }));
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
    async close() {
      clearInterval(heartbeat);
      for (const ws of sockets.clients) ws.terminate();
      await new Promise(resolvePromise => sockets.close(resolvePromise));
      if (server.listening) await new Promise(resolvePromise => server.close(resolvePromise));
    },
  };
}
const entry = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href;
if (entry === import.meta.url) {
  const app = createEventServer({
    dataFile: process.env.ECHO_EVENT_DATA ? resolve(process.env.ECHO_EVENT_DATA) : resolve(HERE, "data/event.json"),
    distDir: process.env.ECHO_DIST_DIR ? resolve(process.env.ECHO_DIST_DIR) : resolve(HERE, "../dist"),
  });
  const host = process.env.HOST || "127.0.0.1";
  const port = Number(process.env.PORT || 5189);
  const address = await app.listen(port, host);
  console.log("[echo-campus] DEMO event service listening on http://" + host + ":" + address.port);
  for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, async () => { await app.close(); process.exit(0); });
}
