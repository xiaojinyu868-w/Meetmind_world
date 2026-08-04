import assert from "node:assert/strict";
import test from "node:test";

import {
  AUDIO_ZONES,
  WorldAudioSystem,
  audioZoneForWorld,
} from "../src/runtime/WorldAudioSystem.js";


class FakeEventRoot {
  constructor() {
    this.nodeType = 9;
    this.visibilityState = "visible";
    this.listeners = new Map();
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }
}


class FakeAudio {
  constructor() {
    this.buffer = null;
    this.isPlaying = false;
    this.loop = false;
    this.volume = 0;
    this.playCount = 0;
    this.pauseCount = 0;
    this.disconnected = false;
    this.gain = {
      gain: {
        value: 0,
        cancelScheduledValues() {},
        setValueAtTime: (value) => {
          this.gain.gain.value = value;
        },
        linearRampToValueAtTime: (value) => {
          this.gain.gain.value = value;
        },
      },
    };
  }

  setBuffer(buffer) {
    this.buffer = buffer;
  }

  setLoop(loop) {
    this.loop = loop;
  }

  setVolume(volume) {
    this.volume = volume;
    this.gain.gain.value = volume;
  }

  play() {
    this.isPlaying = true;
    this.playCount += 1;
  }

  pause() {
    this.isPlaying = false;
    this.pauseCount += 1;
  }

  stop() {
    this.isPlaying = false;
  }

  disconnect() {
    this.disconnected = true;
  }
}


function createHarness(worldId = "hall") {
  const eventRoot = new FakeEventRoot();
  const camera = {
    child: null,
    add(child) { this.child = child; },
    remove(child) { if (this.child === child) this.child = null; },
  };
  const context = {
    state: "suspended",
    currentTime: 0,
    resume() {
      this.state = "running";
      return Promise.resolve();
    },
  };
  const listener = { context };
  const loadedUrls = [];
  const loader = {
    load(url, onLoad) {
      loadedUrls.push(url);
      queueMicrotask(() => onLoad({ url }));
    },
  };
  const audios = [];
  const system = new WorldAudioSystem({
    camera,
    worldId,
    resolveUrl: (path) => `/test/${path}`,
    listener,
    loader,
    createAudio: () => {
      const audio = new FakeAudio();
      audios.push(audio);
      return audio;
    },
    eventRoot,
    fadeDuration: 0,
  });
  return { system, camera, context, eventRoot, loadedUrls, audios };
}


test("worlds map to the correct ambient audio zone", () => {
  assert.equal(audioZoneForWorld("hall"), AUDIO_ZONES.OUTDOOR);
  assert.equal(audioZoneForWorld("field"), AUDIO_ZONES.OUTDOOR);
  assert.equal(audioZoneForWorld("cafe"), AUDIO_ZONES.CAFE);
});


test("ambient audio only plays during free roam and switches zones", async () => {
  const { system, camera, loadedUrls } = createHarness("hall");
  await system.preload();
  assert.equal(loadedUrls.length, 4);
  assert.equal(system.diagnostics.activeAmbient, null);
  assert.equal(system.diagnostics.loadedTracks.length, 4);

  system.setFreeRoamActive(true);
  await system.unlock();
  assert.equal(system.setFreeRoamActive(true), false);
  const outdoor = system.ambience.get(AUDIO_ZONES.OUTDOOR);
  const cafe = system.ambience.get(AUDIO_ZONES.CAFE);
  assert.equal(system.diagnostics.activeAmbient, AUDIO_ZONES.OUTDOOR);
  assert.equal(outdoor.isPlaying, true);
  assert.equal(cafe.isPlaying, false);

  system.setZone(AUDIO_ZONES.CAFE);
  assert.equal(system.diagnostics.activeAmbient, AUDIO_ZONES.CAFE);
  assert.equal(outdoor.isPlaying, false);
  assert.equal(cafe.isPlaying, true);

  system.setFreeRoamActive(false);
  assert.equal(system.diagnostics.activeAmbient, null);
  assert.equal(cafe.isPlaying, false);
  system.dispose();
  assert.equal(camera.child, null);
});


test("notification effects remain available after the audio context is unlocked", async () => {
  const { system } = createHarness("cafe");
  await system.preload();
  assert.equal(await system.playNotification(), false);
  await system.unlock();
  assert.equal(await system.playUiClick(), true);
  assert.equal(await system.playNotification(), true);
  assert.equal(await system.playNotification(), false);
  assert.deepEqual(system.diagnostics.effectPlayCounts, { click: 1, notification: 1 });
  assert.equal(system.diagnostics.lastEffect, "notification");
  assert.equal(system.effects.get("notification").some((audio) => audio.isPlaying), true);
  system.dispose();
});
