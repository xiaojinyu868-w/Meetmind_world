import test from "node:test";
import assert from "node:assert/strict";

import { LiveWorld } from "../src/runtime/LiveWorld.js";
import { renderRelationshipGraph } from "../src/ui/RelationshipGraph.js";
import { currentUser, people, relationships } from "../src/data/demoPeople.js";

const EMPTY_SNAPSHOT = { schema: "echo-snapshot.v1", tick: 0, agents: [], modules: [], events: [] };

function recordingFetch(captured) {
  return async (url, options) => {
    captured.push({ url, headers: options?.headers ?? {} });
    return { ok: true, json: async () => EMPTY_SNAPSHOT };
  };
}

test("LiveWorld 轮询快照时携带 localStorage 的 Bearer token", async () => {
  globalThis.localStorage = { getItem: (key) => (key === "meetmind_access_token" ? "tok-test" : null) };
  try {
    const captured = [];
    const live = new LiveWorld({ snapshotUrl: "/api/v0/world/snapshot", fetchImpl: recordingFetch(captured) });
    live.start();
    await new Promise((resolve) => setTimeout(resolve, 20));
    live.stop();
    assert.equal(captured.length >= 1, true);
    assert.equal(captured[0].headers.authorization, "Bearer tok-test");
    assert.equal(captured[0].headers.accept, "application/json");
  } finally {
    delete globalThis.localStorage;
  }
});

test("LiveWorld 无 token 时保持匿名（不带 authorization 头）", async () => {
  const captured = [];
  const live = new LiveWorld({ snapshotUrl: "/api/v0/world/snapshot", fetchImpl: recordingFetch(captured) });
  live.start();
  await new Promise((resolve) => setTimeout(resolve, 20));
  live.stop();
  assert.equal(captured.length >= 1, true);
  assert.equal(captured[0].headers.authorization, undefined);
});

test("关系 Map 在 people/relationships 清空后仍渲染 currentUser 单节点", () => {
  assert.deepEqual(people, []);
  assert.deepEqual(relationships, []);
  const container = { innerHTML: "" };
  renderRelationshipGraph(container, { currentUser, people, relationships });
  assert.equal(container.innerHTML.includes("relationship-line"), false);
  assert.equal(container.innerHTML.includes("is-self"), true);
  assert.equal(container.innerHTML.includes(currentUser.displayName), true);
});
