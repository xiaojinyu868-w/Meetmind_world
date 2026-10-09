import { createHash } from "node:crypto";
import { personaById } from "../src/shared/personas.mjs";

// A partner community's members on the map (docs/DAIMAO-INTEGRATION-DRAFT.md):
// read every minute from the partner's read-only endpoint, kept on failure.
const ID = /^[A-Za-z0-9_-]{1,64}$/;
const SOURCE = /^[a-z][a-z0-9-]{0,23}$/;
const HEX = /^#[0-9a-fA-F]{6}$/;
const LIMITS = Object.freeze({ nickname: 24, role: 60, organization: 80, bio: 160, offer: 160, need: 160 });
export const MAX_PARTNER_MEMBERS = 2000;
const MAX_PAGES = 10;

function text(value, max) {
  if (typeof value !== "string") return "";
  const clean = value.normalize("NFC").replace(/[<>\u0000-\u001f\u007f]/g, "").trim().replace(/\s+/g, " ");
  return [...clean].slice(0, max).join("");
}

/**
 * One partner member in the public attendee shape, or null when it may not be
 * shown (no consent, no usable id or nickname). The id, persona and floor
 * serial derive from the partner's id, so every screen places them alike.
 */
export function partnerMember(raw, { source, label, categories, personas, colorOf }) {
  if (!raw || typeof raw !== "object" || raw.consent !== true) return null;
  const id = typeof raw.id === "string" ? raw.id.trim() : Number.isSafeInteger(raw.id) ? String(raw.id) : "";
  if (!ID.test(id)) return null;
  const name = text(raw.nickname ?? raw.name, LIMITS.nickname);
  if (!name) return null;
  const category = typeof raw.category === "string" && categories.has(raw.category) ? raw.category : "guest";
  const digest = createHash("sha256").update(source + ":" + id).digest();
  const persona = typeof raw.avatar === "string" && personas.includes(raw.avatar) ? raw.avatar : personas[digest.readUInt32BE(0) % personas.length];
  const avatarColor = typeof raw.avatar === "string" && HEX.test(raw.avatar) ? raw.avatar.toLowerCase() : (personaById(persona)?.color || "#758b79");
  return {
    id: `${source}-${id}`, name, role: text(raw.role, LIMITS.role), offer: text(raw.offer, LIMITS.offer), need: text(raw.need, LIMITS.need),
    organization: text(raw.organization, LIMITS.organization), bio: text(raw.bio, LIMITS.bio), avatarColor, persona,
    // Above any arrival number: a stable place on the floor plan of its own.
    serial: 100000 + digest.readUInt32BE(4) % 900000,
    publicContact: false, sharesContact: false, category, wristbandColor: colorOf(category),
    synthetic: false, source, remote: true, partner: label, active: raw.active === true,
  };
}

/**
 * Reads `url` (Authorization: Bearer `token`) now and every `intervalMs`,
 * following `nextCursor` pages, and hands the cleaned list to
 * store.setRemote(). A failed read keeps the previous list. Returns
 * { status, refresh(), stop() }.
 */
export function startPartnerFeed({ store, url, token = "", label = "合作伙伴", source = "partner", intervalMs = 60000, timeoutMs = 5000, fetchImpl = globalThis.fetch, log = () => {} }) {
  if (!SOURCE.test(source)) throw new Error("partner feed source 需要小写字母开头的短标识");
  const target = new URL(url);
  const status = { source, label, host: target.host, ok: null, count: 0, fetchedAt: null, error: null, failures: 0 };
  let timer = null, running = null, stopped = false;
  async function page(cursor) {
    const address = new URL(target);
    if (cursor) address.searchParams.set("cursor", cursor);
    const controller = new AbortController();
    const abort = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(address, { headers: { Accept: "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) }, signal: controller.signal });
      if (!response.ok) throw new Error("HTTP " + response.status);
      return await response.json();
    } finally { clearTimeout(abort); }
  }
  async function readAll() {
    const context = {
      source, label, personas: store.state.event.personas,
      categories: new Set(store.categories().map(item => item.id)), colorOf: id => store.category(id).wristbandColor,
    };
    const members = [], seen = new Set();
    let cursor = null;
    for (let n = 0; n < MAX_PAGES; n++) {
      const body = await page(cursor);
      const list = Array.isArray(body) ? body : Array.isArray(body?.members) ? body.members : null;
      if (!list) throw new Error("响应里没有 members 数组");
      for (const raw of list) {
        const member = partnerMember(raw, context);
        if (member && !seen.has(member.id) && members.length < MAX_PARTNER_MEMBERS) { seen.add(member.id); members.push(member); }
      }
      cursor = typeof body?.nextCursor === "string" && body.nextCursor ? body.nextCursor : null;
      if (!cursor || members.length >= MAX_PARTNER_MEMBERS) break;
    }
    return members;
  }
  async function refresh() {
    if (stopped) return status;
    if (running) return running;
    running = (async () => {
      try {
        const members = await readAll();
        store.setRemote({ source, label, members });
        Object.assign(status, { ok: true, count: members.length, fetchedAt: new Date().toISOString(), error: null, failures: 0 });
      } catch (error) {
        Object.assign(status, { ok: false, error: (error?.name === "AbortError" ? "请求超时" : String(error?.message || error)).slice(0, 120), failures: status.failures + 1 });
        log(`[echo-campus] partner feed ${source} failed (${status.failures}): ${status.error}`);
      } finally { running = null; }
      return status;
    })();
    return running;
  }
  function loop() { refresh().finally(() => { if (!stopped) { timer = setTimeout(loop, intervalMs); timer.unref?.(); } }); }
  loop();
  return { status, refresh, stop() { stopped = true; clearTimeout(timer); } };
}
