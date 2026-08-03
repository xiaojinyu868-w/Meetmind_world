import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";

import { BoothSystem } from "./BoothSystem.js";


test("loads the catalogued environment-module booth template", async () => {
  const calls = [];
  const template = new THREE.Group();
  const system = new BoothSystem({
    scene: new THREE.Scene(),
    assetStore: {
      async loadScene(url) {
        calls.push(["loadScene", url]);
        return template;
      },
    },
    assetCatalog: {
      resolve(assetId, expectedKind) {
        calls.push(["resolve", assetId, expectedKind]);
        return { resolvedUrl: "/models/modules/market-stall.glb" };
      },
    },
  });

  await system.prepare();

  assert.equal(system.template, template);
  assert.equal(system.templateSource, "asset");
  assert.deepEqual(calls, [
    ["resolve", "module.market-stall.v1", "environment-module"],
    ["loadScene", "/models/modules/market-stall.glb"],
  ]);
});


test("falls back without failing world boot when the template is unavailable", async () => {
  const system = new BoothSystem({
    scene: new THREE.Scene(),
    assetStore: { loadScene: async () => null },
    assetCatalog: {
      resolve() {
        throw new Error("catalog offline");
      },
    },
  });

  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    await system.prepare();
  } finally {
    console.warn = originalWarn;
  }

  assert.equal(system.templateSource, "fallback");
  assert.equal(system.template.name, "BOOTH_TemplateFallback");
});
