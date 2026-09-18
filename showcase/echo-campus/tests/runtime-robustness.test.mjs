import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { EventClient } from "../src/runtime/EventClient.js";
import { defaultManifest, validateManifest } from "../src/runtime/SceneManifest.js";
import { importScene, loadGLTFWithDraco } from "../src/runtime/SceneImporter.js";

function storageWith(token = "") {
  const values = new Map(token ? [["echo-campus-token", token]] : []);
  return { getItem: k => values.get(k) ?? null, setItem: (k,v) => values.set(k,v), removeItem: k => values.delete(k) };
}
function timers() {
  const queue = new Map(); let id = 0;
  return { setTimeout: (fn, delay) => { queue.set(++id, { fn, delay }); return id; }, clearTimeout: id => queue.delete(id), queue };
}
function response(status, data) { return { ok: status >= 200 && status < 300, status, json: async () => data }; }
function snapshot(version = 1) { return { event: { id: "test" }, version, attendees: [], connections: [] }; }

test("tab demo storage is explicit and ordinary URLs retain shared browser storage", () => {
  const owner = { localStorage: storageWith("normal"), sessionStorage: storageWith("tab") };
  for (const search of ["", "?persona=02", "?demoSession=window", "?demoSession=TAB"]) assert.equal(EventClient.storageFor(search, owner), owner.localStorage);
  assert.equal(EventClient.storageFor("?entry=nfc&demoSession=tab", owner), owner.sessionStorage);
  assert.equal(EventClient.storageFor(new URLSearchParams("demoSession=tab"), owner), owner.sessionStorage);
  assert.equal(EventClient.storageFor("?demoSession=tab", { get sessionStorage() { throw new Error("blocked"); } }), null);
});

test("default browser fetch keeps the Window receiver through startup, join and identity refresh", async t => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  // Node fetch accepts any receiver; browsers reject EventClient as an illegal Window receiver.
  globalThis.fetch = async function(url, options) {
    assert.equal(this, globalThis, "native browser fetch must be called on its owning global");
    requests.push({ path: url.pathname, method: options.method || "GET" });
    if (url.pathname.endsWith("/join")) return response(201, { token: "browser-token", attendee: { id: "browser-me" }, snapshot: snapshot(2) });
    if (url.pathname.endsWith("/me")) return response(200, { attendee: { id: "browser-me" }, encounters: [], version: 2 });
    return response(200, snapshot(1));
  };
  const client = new EventClient({ storage: storageWith(), WebSocketImpl: null, timers: timers() });
  t.after(() => { globalThis.fetch = originalFetch; client.dispose(); });
  assert.equal(await client.start(), true);
  await client.join({ name: "Browser attendee", consent: true });
  assert.equal(client.me.attendee.id, "browser-me");
  assert.deepEqual(requests, [
    { path: "/api/event", method: "GET" },
    { path: "/api/join", method: "POST" },
    { path: "/api/me", method: "GET" },
  ]);
});

test("an injected fetch implementation is preserved without rebinding", async () => {
  const injectedFetch = async () => response(200, snapshot(3));
  const client = new EventClient({ storage: storageWith(), WebSocketImpl: null, timers: timers(), fetchImpl: injectedFetch });
  assert.equal(client.fetchImpl, injectedFetch);
  assert.equal((await client.request("event")).version, 3);
  client.dispose();
});

test("expired sessions clear token and notify UI; transient outages preserve the authenticated identity", async () => {
  const storage = storageWith("test-session");
  let mode = "outage";
  const client = new EventClient({ storage, WebSocketImpl: null, timers: timers(), fetchImpl: async () => {
    if (mode === "outage") throw new Error("network unavailable");
    return response(401, { error: { code: "SESSION_EXPIRED", message: "已过期" } });
  } });
  const original = { attendee: { id: "me" }, version: 2, encounters: [] };
  client.me = original;
  const events = []; client.addEventListener("me", event => events.push(event.detail));
  assert.equal(await client.refreshMe(), original);
  assert.equal(client.token, "test-session");
  assert.equal(client.me, original);
  mode = "expired";
  assert.equal(await client.refreshMe(), null);
  assert.equal(client.token, "");
  assert.equal(storage.getItem("echo-campus-token"), null);
  assert.deepEqual(events, [null]);
  client.dispose();
});

test("snapshot versions deduplicate messages and reject malformed state", () => {
  const client = new EventClient({ storage: storageWith(), WebSocketImpl: null, timers: timers() });
  let updates = 0; client.addEventListener("snapshot", () => updates++);
  assert.equal(client.setSnapshot(snapshot(2)), true);
  assert.equal(client.setSnapshot(snapshot(2)), false);
  assert.equal(client.setSnapshot(snapshot(1)), false);
  assert.equal(client.setSnapshot({ ...snapshot(), version: NaN }), false);
  assert.equal(client.setSnapshot({ ...snapshot(3), connections: undefined }), false);
  assert.equal(client.setSnapshot(snapshot(3)), true);
  assert.equal(updates, 2);
  client.dispose();
});

test("client recovers after initial HTTP failure and cancels reconnect/poll on disposal", async () => {
  const timer = timers(); const sockets = [];
  class FakeSocket {
    constructor(url) { this.url = url; this.readyState = 0; sockets.push(this); }
    close() { this.readyState = 3; this.onclose?.(); }
  }
  const client = new EventClient({ storage: storageWith(), WebSocketImpl: FakeSocket, timers: timer, fetchImpl: async () => { throw new Error("initial outage"); } });
  assert.equal(await client.start(), false);
  assert.equal(sockets.length, 1, "must still open WebSocket recovery after initial failure");
  sockets[0].readyState = 1; sockets[0].onopen();
  sockets[0].onmessage({ data: JSON.stringify(snapshot(4)) });
  assert.equal(client.snapshot.version, 4);
  sockets[0].close();
  assert.equal(timer.queue.size, 2, "one reconnect and one fallback poll");
  client.dispose();
  assert.equal(timer.queue.size, 0);
});

test("overlapping /me refreshes are coalesced and catch up to newer snapshot version", async () => {
  let release; let requests = 0;
  const client = new EventClient({ storage: storageWith("test-session"), WebSocketImpl: null, timers: timers(), fetchImpl: async () => {
    requests++;
    if (requests === 1) return new Promise(resolve => { release = () => resolve(response(200, { attendee: { id: "me" }, encounters: [], version: 1 })); });
    return response(200, { attendee: { id: "me" }, encounters: [{ id: "pending" }], version: 2 });
  } });
  client.setSnapshot(snapshot(1));
  const first = client.refreshMe();
  client.setSnapshot(snapshot(2));
  const second = client.refreshMe();
  assert.equal(requests, 1);
  release();
  await Promise.all([first, second]);
  assert.equal(requests, 2);
  assert.equal(client.me.version, 2);
  assert.equal(client.me.encounters.length, 1);
  client.dispose();
});

test("join never invents consent and UI identity is available before snapshot observers run", async () => {
  let calls = 0;
  const client = new EventClient({ storage: storageWith(), WebSocketImpl: null, timers: timers(), fetchImpl: async url => {
    calls++;
    return url.pathname.endsWith("/join") ? response(201, { token: "new-token", attendee: { id: "me" }, snapshot: snapshot(2) }) :
      response(200, { attendee: { id: "me" }, encounters: [], version: 2 });
  } });
  await assert.rejects(client.join({ name: "A" }), /公开展示/);
  assert.equal(calls, 0);
  client.addEventListener("snapshot", () => assert.equal(client.me.attendee.id, "me"));
  await client.join({ name: "A", consent: true });
  assert.equal(client.token, "new-token");
  client.dispose();
});

test("manifest validates all gameplay and camera boundaries before any asset load", async () => {
  const base = defaultManifest();
  for (const patch of [
    { anchors: { arrival: { x: Infinity, y: 0, z: 0 } } },
    { anchors: { people: [] } },
    { anchors: { meeting: { x: 500, y: 0, z: 0 } } },
    { cameras: { hero: { position: [0,0,0], target: [0,0,0] } } },
    { cameras: { hero: { position: [1,2,3], target: [0,0,0], fov: 179 } } },
    { cameras: { hero: { target: [0,0,0] } } },
    { colliders: [{ x: 0, z: 0, r: -2 }] },
    { colliders: [{ x: 0, z: 8, r: 2 }] },
    { groundY: "zero" }, { url: "https:example.com" }, { url: "https://user:password@example.com/model.glb" },
  ]) {
    let loads = 0;
    await assert.rejects(importScene({ ...base, ...patch }, { loadGLTF: async () => { loads++; } }));
    assert.equal(loads, 0);
  }
  const input = { ...base, cameras: { detail: { position: [5,3,6], target: [0,0,0], fov: 35 } }, colliders: [{ x: 10, z: 10, radius: 2 }] };
  const validated = validateManifest(input);
  assert.equal(validated.colliders[0].r, 2);
  input.cameras.detail.position[0] = 999;
  assert.equal(validated.cameras.detail.position[0], 5, "validated manifest must not retain mutable input references");
});

test("GLB import preserves all standard cameras with partial overrides and disposes shared resources once", async () => {
  const object = new THREE.Group(), secondary = new THREE.Group(), geometry = new THREE.BoxGeometry(), texture = new THREE.Texture();
  const material = new THREE.MeshStandardMaterial({ map: texture });
  object.add(new THREE.Mesh(geometry, material), new THREE.Mesh(geometry, material));
  secondary.add(new THREE.Mesh(geometry, material));
  let geometryDisposed = 0, materialDisposed = 0, textureDisposed = 0;
  geometry.addEventListener("dispose", () => geometryDisposed++);
  material.addEventListener("dispose", () => materialDisposed++);
  texture.addEventListener("dispose", () => textureDisposed++);
  const revoked = [];
  const result = await importScene({ ...defaultManifest(), cameras: { hero: { position:[10,10,10],target:[0,0,0],fov:40 } } }, {
    file: { name:"test.glb", size: 10 },
    objectUrls: { createObjectURL: () => "blob:http://test/model", revokeObjectURL: url => revoked.push(url) },
    loadGLTF: async () => ({ scene: object, scenes:[object, secondary] }),
  });
  for (const name of ["hero","arrival","garden","aerial"]) assert.ok(result.cameras[name]);
  assert.equal(result.cameras.hero.fov, 40);
  assert.equal(result.root.parent, null, "importer never attaches itself to the running world");
  result.dispose(); result.dispose();
  assert.deepEqual([geometryDisposed,materialDisposed,textureDisposed],[1,1,1]);
  assert.deepEqual(revoked, ["blob:http://test/model"]);
});

test("failed Splat initialization releases loader resources and leaves external scene intact", async () => {
  const external = new THREE.Scene(); const previous = new THREE.Group(); external.add(previous);
  let splatDisposals = 0, rendererDisposals = 0; const revoked = [];
  class SplatMesh extends THREE.Group {
    constructor() { super(); this.initialized = Promise.reject(new Error("malformed SPZ")); }
    dispose() { splatDisposals++; }
  }
  class SparkRenderer extends THREE.Group {
    dispose() { rendererDisposals++; }
  }
  await assert.rejects(importScene(defaultManifest("splat"), {
    renderer: {}, file: { name:"broken.spz",size:10,arrayBuffer:async()=>new ArrayBuffer(10) },
    objectUrls: { createObjectURL: () => "blob:http://test/spz", revokeObjectURL: url => revoked.push(url) },
    loadSpark: async () => ({ SplatMesh, SparkRenderer }),
  }), /malformed SPZ/);
  assert.equal(external.children[0], previous);
  assert.deepEqual([splatDisposals,rendererDisposals],[1,1]);
  assert.deepEqual(revoked,["blob:http://test/spz"]);
});

test("local GLTF refuses external dependencies before loader/network access", async () => {
  let loaded = false; const revoked = [];
  await assert.rejects(importScene(defaultManifest("glb"), {
    file: { name:"unsafe.gltf",size:10,text:async()=>JSON.stringify({ buffers:[{uri:"https://external.invalid/buffer.bin"}] }) },
    objectUrls: { createObjectURL: () => "blob:http://test/gltf", revokeObjectURL: url => revoked.push(url) },
    loadGLTF: async () => { loaded = true; },
  }), /单个 GLB/);
  assert.equal(loaded,false);
  assert.equal(revoked.length,1);
});

test("Draco decoder stays app-local and disposes workers on success and failure", async () => {
  for (const shouldFail of [false, true]) {
    const modelManager = new THREE.LoadingManager();
    modelManager.setURLModifier(url => { if (!url.startsWith("blob:")) throw new Error("external model resource blocked"); return url; });
    let decoder, loader, disposed = 0;
    class FakeDraco {
      constructor(manager) { this.manager = manager; decoder = this; }
      setDecoderPath(path) { this.path = path; return this; }
      setWorkerLimit(limit) { this.limit = limit; return this; }
      dispose() { disposed++; }
    }
    class FakeGLTF {
      constructor(manager) { this.manager = manager; loader = this; }
      setDRACOLoader(value) { this.draco = value; return this; }
      async loadAsync(url) {
        assert.equal(this.manager.resolveURL(url), "blob:test/model");
        assert.equal(this.draco.manager.resolveURL(this.draco.path + "draco_decoder.wasm"), "/echo-campus/draco/draco_decoder.wasm");
        if (shouldFail) throw new Error("decode failed");
        return { scene: "decoded" };
      }
    }
    const load = loadGLTFWithDraco("blob:test/model", modelManager, { GLTFLoaderImpl: FakeGLTF, DRACOLoaderImpl: FakeDraco, baseUrl: "/echo-campus/" });
    if (shouldFail) await assert.rejects(load, /decode failed/);
    else assert.deepEqual(await load, { scene: "decoded" });
    assert.equal(loader.draco, decoder);assert.notEqual(decoder.manager, modelManager);
    assert.equal(decoder.limit, 2);assert.equal(disposed, 1);
    assert.throws(() => modelManager.resolveURL("https://external.invalid/private.bin"), /blocked/);
  }
});
