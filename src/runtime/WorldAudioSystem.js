import * as THREE from "three";


export const AUDIO_ZONES = Object.freeze({
  OUTDOOR: "outdoor",
  CAFE: "cafe",
});

export const AUDIO_TRACKS = Object.freeze({
  outdoor: Object.freeze({
    id: "evening-forest",
    path: "audio/evening-forest-ambience.mp3",
    volume: 0.16,
  }),
  cafe: Object.freeze({
    id: "cafe-ambience",
    path: "audio/cafe-ambience.mp3",
    volume: 0.12,
  }),
  click: Object.freeze({
    id: "soft-button-click",
    path: "audio/soft-button-click.mp3",
    volume: 0.22,
    poolSize: 3,
  }),
  notification: Object.freeze({
    id: "notification-chime",
    path: "audio/notification-chime.mp3",
    volume: 0.28,
    poolSize: 2,
    minIntervalMs: 2200,
  }),
});


export function audioZoneForWorld(worldId) {
  return worldId === "cafe" ? AUDIO_ZONES.CAFE : AUDIO_ZONES.OUTDOOR;
}


function createPool(listener, count, createAudio) {
  return Array.from({ length: count }, () => createAudio(listener));
}


function isEnabledUiControl(target) {
  const control = target?.closest?.("button, [role='button'], a[href]");
  if (!control) return false;
  if (control.dataset?.audio === "none") return false;
  if (control.getAttribute?.("aria-disabled") === "true") return false;
  if (control.disabled || control.matches?.(":disabled")) return false;
  return true;
}


export class WorldAudioSystem {
  constructor({
    camera,
    worldId = "hall",
    resolveUrl = (path) => `/${String(path).replace(/^\/+/, "")}`,
    listener = new THREE.AudioListener(),
    loader = new THREE.AudioLoader(),
    createAudio = (audioListener) => new THREE.Audio(audioListener),
    eventRoot = globalThis.document ?? null,
    fadeDuration = 0.65,
    onStateChange = () => {},
  } = {}) {
    if (!camera?.add) throw new Error("WorldAudioSystem requires a Three.js camera");

    this.camera = camera;
    this.listener = listener;
    this.loader = loader;
    this.resolveUrl = resolveUrl;
    this.eventRoot = eventRoot;
    this.document = eventRoot?.nodeType === 9 ? eventRoot : eventRoot?.ownerDocument ?? null;
    this.fadeDuration = Math.max(0, Number(fadeDuration) || 0);
    this.onStateChange = onStateChange;
    this.zone = audioZoneForWorld(worldId);
    this.freeRoamActive = false;
    this.unlocked = false;
    this.disposed = false;
    this.activeAmbient = null;
    this.lastEffect = null;
    this.effectPlayCounts = { click: 0, notification: 0 };
    this.loadedTrackIds = new Set();
    this.failedTrackIds = new Set();
    this.fadeTimers = new Map();
    this.effectCursors = new Map();
    this.effectPlayedAt = new Map();
    this.preloadPromise = null;
    this.unlockPromise = null;

    this.ambience = new Map([
      [AUDIO_ZONES.OUTDOOR, createAudio(listener)],
      [AUDIO_ZONES.CAFE, createAudio(listener)],
    ]);
    this.effects = new Map([
      ["click", createPool(listener, AUDIO_TRACKS.click.poolSize, createAudio)],
      ["notification", createPool(listener, AUDIO_TRACKS.notification.poolSize, createAudio)],
    ]);

    camera.add(listener);
    this.handleUiClick = (event) => {
      if (!isEnabledUiControl(event.target)) return;
      void this.playUiClick();
    };
    this.handleVisibilityChange = () => this.syncAmbient();
    this.eventRoot?.addEventListener?.("click", this.handleUiClick, true);
    this.document?.addEventListener?.("visibilitychange", this.handleVisibilityChange);
    this.emitState();
  }

  get diagnostics() {
    return Object.freeze({
      zone: this.zone,
      freeRoam: this.freeRoamActive,
      unlocked: this.unlocked,
      contextState: this.listener.context?.state ?? "unknown",
      activeAmbient: this.activeAmbient,
      lastEffect: this.lastEffect,
      effectPlayCounts: { ...this.effectPlayCounts },
      loadedTracks: [...this.loadedTrackIds],
      failedTracks: [...this.failedTrackIds],
    });
  }

  preload() {
    if (this.preloadPromise) return this.preloadPromise;
    const jobs = [
      this.loadTrack(AUDIO_TRACKS.outdoor, [this.ambience.get(AUDIO_ZONES.OUTDOOR)], true),
      this.loadTrack(AUDIO_TRACKS.cafe, [this.ambience.get(AUDIO_ZONES.CAFE)], true),
      this.loadTrack(AUDIO_TRACKS.click, this.effects.get("click"), false),
      this.loadTrack(AUDIO_TRACKS.notification, this.effects.get("notification"), false),
    ];
    this.preloadPromise = Promise.all(jobs).then(() => {
      this.syncAmbient();
      this.emitState();
      return this.diagnostics;
    });
    return this.preloadPromise;
  }

  loadTrack(track, audioNodes, loop) {
    return new Promise((resolve) => {
      this.loader.load(
        this.resolveUrl(track.path),
        (buffer) => {
          for (const audio of audioNodes) {
            audio.setBuffer(buffer);
            audio.setLoop(loop);
            audio.setVolume(loop ? 0 : track.volume);
          }
          this.loadedTrackIds.add(track.id);
          resolve(true);
        },
        undefined,
        (error) => {
          this.failedTrackIds.add(track.id);
          console.warn(`[EchoWorld] Audio failed to load: ${track.path}`, error);
          resolve(false);
        },
      );
    });
  }

  async unlock() {
    if (this.disposed) return false;
    if (this.unlocked && this.listener.context?.state === "running") return true;
    if (this.unlockPromise) return this.unlockPromise;

    const context = this.listener.context;
    this.unlockPromise = Promise.resolve(context?.resume?.())
      .then(() => {
        this.unlocked = !context || context.state === "running";
        this.syncAmbient();
        this.emitState();
        return this.unlocked;
      })
      .catch((error) => {
        console.warn("[EchoWorld] Audio context could not be resumed", error);
        return false;
      })
      .finally(() => {
        this.unlockPromise = null;
      });
    return this.unlockPromise;
  }

  setFreeRoamActive(active) {
    const nextActive = Boolean(active);
    if (this.freeRoamActive === nextActive) return false;
    this.freeRoamActive = nextActive;
    if (this.freeRoamActive) void this.unlock();
    this.syncAmbient();
    this.emitState();
    return true;
  }

  setZone(zone) {
    if (!Object.values(AUDIO_ZONES).includes(zone) || this.zone === zone) return false;
    this.zone = zone;
    this.syncAmbient();
    this.emitState();
    return true;
  }

  syncAmbient() {
    if (this.disposed) return;
    const visible = this.document?.visibilityState !== "hidden";
    const track = AUDIO_TRACKS[this.zone];
    const canPlay = Boolean(
      visible &&
      this.freeRoamActive &&
      this.unlocked &&
      track &&
      this.loadedTrackIds.has(track.id),
    );

    this.activeAmbient = canPlay ? this.zone : null;
    for (const [zone, audio] of this.ambience) {
      const zoneTrack = AUDIO_TRACKS[zone];
      const shouldPlay = canPlay && zone === this.zone;
      this.fadeAudio(audio, shouldPlay ? zoneTrack.volume : 0, !shouldPlay);
    }
    this.emitState();
  }

  fadeAudio(audio, targetVolume, pauseAfterFade) {
    if (!audio) return;
    globalThis.clearTimeout(this.fadeTimers.get(audio));
    this.fadeTimers.delete(audio);

    if (targetVolume > 0 && !audio.isPlaying && audio.buffer) {
      try {
        audio.play();
      } catch (error) {
        console.warn("[EchoWorld] Ambient playback could not start", error);
      }
    }

    const gain = audio.gain?.gain;
    const now = this.listener.context?.currentTime ?? 0;
    if (gain?.cancelScheduledValues && gain?.linearRampToValueAtTime) {
      gain.cancelScheduledValues(now);
      gain.setValueAtTime(gain.value, now);
      gain.linearRampToValueAtTime(targetVolume, now + this.fadeDuration);
    } else {
      audio.setVolume(targetVolume);
    }

    if (!pauseAfterFade || !audio.isPlaying) return;
    if (this.fadeDuration === 0) {
      audio.pause();
      return;
    }
    const timer = globalThis.setTimeout(() => {
      this.fadeTimers.delete(audio);
      if (audio.isPlaying) audio.pause();
    }, this.fadeDuration * 1000 + 40);
    this.fadeTimers.set(audio, timer);
  }

  async playUiClick() {
    const unlocked = await this.unlock();
    if (!unlocked) return false;
    await this.preload();
    return this.playEffect("click");
  }

  async playNotification() {
    if (!this.unlocked || this.document?.visibilityState === "hidden") return false;
    await this.preload();
    return this.playEffect("notification");
  }

  playEffect(kind) {
    const track = AUDIO_TRACKS[kind];
    const pool = this.effects.get(kind);
    if (!track || !pool?.length || !this.loadedTrackIds.has(track.id)) return false;
    const now = globalThis.performance?.now?.() ?? Date.now();
    const lastPlayedAt = this.effectPlayedAt.get(kind) ?? Number.NEGATIVE_INFINITY;
    if (now - lastPlayedAt < (track.minIntervalMs ?? 0)) return false;

    let index = pool.findIndex((audio) => !audio.isPlaying);
    if (index < 0) index = this.effectCursors.get(kind) ?? 0;
    const audio = pool[index];
    this.effectCursors.set(kind, (index + 1) % pool.length);
    if (audio.isPlaying) audio.stop();
    audio.setVolume(track.volume);
    try {
      audio.play();
      this.effectPlayedAt.set(kind, now);
      this.lastEffect = kind;
      this.effectPlayCounts[kind] += 1;
      this.emitState();
      return true;
    } catch (error) {
      console.warn(`[EchoWorld] ${kind} sound could not start`, error);
      return false;
    }
  }

  emitState() {
    this.onStateChange(this.diagnostics);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.eventRoot?.removeEventListener?.("click", this.handleUiClick, true);
    this.document?.removeEventListener?.("visibilitychange", this.handleVisibilityChange);
    for (const timer of this.fadeTimers.values()) globalThis.clearTimeout(timer);
    this.fadeTimers.clear();
    for (const audio of [...this.ambience.values(), ...this.effects.values()].flat()) {
      if (audio?.isPlaying) audio.stop();
      audio?.disconnect?.();
    }
    this.camera.remove?.(this.listener);
    this.activeAmbient = null;
  }
}
