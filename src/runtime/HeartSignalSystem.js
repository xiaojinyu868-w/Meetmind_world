import * as THREE from "three";


const DEFAULT_MARKER_WIDTH = 0.58;
const DEFAULT_MARKER_HEIGHT = 0.27;
const DEFAULT_ANCHOR_HEIGHT = 1.82;
const MIN_WORLD_SCALE = 0.0001;


function finiteNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}


function normalizedText(value, fallback) {
  const text = String(value ?? "").trim();
  return text || fallback;
}


function nextNullableNumber(value, previousValue, min, max) {
  if (value === undefined) return previousValue ?? null;
  const number = finiteNumber(value, null);
  return number === null ? null : THREE.MathUtils.clamp(number, min, max);
}


function normalizeSnapshot(personId, snapshot = {}, previous = null) {
  const previousHeart = previous?.heart ?? {};
  const heart = snapshot?.heart ?? {};
  return {
    personId,
    heart: {
      heartScore: nextNullableNumber(heart.heartScore, previousHeart.heartScore, 0, 100),
      currentBpm: nextNullableNumber(heart.currentBpm, previousHeart.currentBpm, 0, 260),
      baselineBpm: nextNullableNumber(heart.baselineBpm, previousHeart.baselineBpm, 0, 260),
      trend: normalizedText(heart.trend, previousHeart.trend ?? "stable"),
    },
    capturedAt:
      snapshot?.capturedAt === undefined
        ? (previous?.capturedAt ?? null)
        : snapshot.capturedAt,
    status: normalizedText(snapshot?.status, previous?.status ?? "pending"),
  };
}


function renderKey(snapshot) {
  return [
    snapshot.heart.heartScore === null ? "missing" : Math.round(snapshot.heart.heartScore),
    snapshot.heart.trend,
    snapshot.status,
  ].join("|");
}


function beatBpmForScore(score, minimum, maximum) {
  return THREE.MathUtils.lerp(minimum, maximum, finiteNumber(score, 0) / 100);
}


function hashPhase(value) {
  let hash = 2166136261;
  const text = String(value);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 1000) / 1000;
}


function gaussian(value, center, width) {
  const offset = (value - center) / width;
  return Math.exp(-offset * offset);
}


function heartbeatPulse(elapsedSeconds, bpm, phaseOffset) {
  const cycle = elapsedSeconds * (bpm / 60) + phaseOffset;
  const phase = cycle - Math.floor(cycle);
  return Math.min(
    1,
    gaussian(phase, 0.08, 0.055) + gaussian(phase, 0.25, 0.07) * 0.58,
  );
}


function roundedRect(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width * 0.5, height * 0.5);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(
    x + width,
    y + height,
    x + width - safeRadius,
    y + height,
  );
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}


function drawHeart(context, centerX, centerY, size) {
  const half = size * 0.5;
  context.beginPath();
  context.moveTo(centerX, centerY + half * 0.9);
  context.bezierCurveTo(
    centerX - half * 1.2,
    centerY + half * 0.15,
    centerX - half * 1.02,
    centerY - half * 0.82,
    centerX - half * 0.44,
    centerY - half * 0.82,
  );
  context.bezierCurveTo(
    centerX - half * 0.12,
    centerY - half * 0.82,
    centerX,
    centerY - half * 0.54,
    centerX,
    centerY - half * 0.34,
  );
  context.bezierCurveTo(
    centerX,
    centerY - half * 0.54,
    centerX + half * 0.12,
    centerY - half * 0.82,
    centerX + half * 0.44,
    centerY - half * 0.82,
  );
  context.bezierCurveTo(
    centerX + half * 1.02,
    centerY - half * 0.82,
    centerX + half * 1.2,
    centerY + half * 0.15,
    centerX,
    centerY + half * 0.9,
  );
  context.closePath();
  context.fill();
}


function isInactiveStatus(status) {
  return /^(offline|missing|pending|stale|unavailable|error)$/i.test(status);
}


function drawMarker(record) {
  const { canvas, context, snapshot } = record;
  const score = snapshot.heart.heartScore;
  const roundedScore = score === null ? null : Math.round(score);
  const inactive = score === null || isInactiveStatus(snapshot.status);
  const heartColor = inactive
    ? "#9ca3af"
    : `hsl(${Math.round(5 - roundedScore * 0.05)} 84% ${Math.round(61 - roundedScore * 0.09)}%)`;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.shadowColor = "rgba(29, 35, 42, 0.20)";
  context.shadowBlur = 14;
  context.shadowOffsetY = 5;
  roundedRect(context, 10, 10, canvas.width - 20, canvas.height - 26, 38);
  context.fillStyle = inactive ? "rgba(245, 246, 248, 0.94)" : "rgba(255, 255, 255, 0.96)";
  context.fill();
  context.shadowColor = "transparent";
  context.lineWidth = 3;
  context.strokeStyle = inactive ? "rgba(156, 163, 175, 0.42)" : "rgba(255, 92, 112, 0.32)";
  context.stroke();

  context.fillStyle = heartColor;
  drawHeart(context, 82, 70, 65);

  context.fillStyle = inactive ? "#6b7280" : "#22252a";
  context.font = "700 61px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(roundedScore === null ? "--" : String(roundedScore), 214, 69);
  context.restore();

  record.texture.needsUpdate = true;
  record.redrawCount += 1;
}


function defaultCanvasFactory(width, height) {
  let canvas = null;
  if (typeof document !== "undefined" && document.createElement) {
    canvas = document.createElement("canvas");
  } else if (typeof OffscreenCanvas !== "undefined") {
    canvas = new OffscreenCanvas(width, height);
  }
  if (!canvas) return null;
  canvas.width = width;
  canvas.height = height;
  return canvas;
}


function modelTopInRootSpace(entity, fallbackHeight) {
  const root = entity?.root;
  const target = entity?.model ?? root;
  if (!root?.isObject3D || !target?.isObject3D) return fallbackHeight;

  root.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(target);
  if (bounds.isEmpty() || !Number.isFinite(bounds.max.y)) return fallbackHeight;

  const rootPosition = root.getWorldPosition(new THREE.Vector3());
  const top = new THREE.Vector3(rootPosition.x, bounds.max.y, rootPosition.z);
  root.worldToLocal(top);
  return Number.isFinite(top.y) ? top.y : fallbackHeight;
}


function cloneState(record) {
  return {
    personId: record.personId,
    heart: { ...record.snapshot.heart },
    capturedAt: record.snapshot.capturedAt,
    status: record.snapshot.status,
    animation: {
      beatBpm: record.beatBpm,
      pulse: record.pulse,
    },
    render: {
      redrawCount: record.redrawCount,
      markerWidth: record.baseWidth,
      markerHeight: record.baseHeight,
    },
  };
}


export class HeartSignalSystem {
  constructor({
    canvasFactory = defaultCanvasFactory,
    canvasWidth = 320,
    canvasHeight = 152,
    markerWidth = DEFAULT_MARKER_WIDTH,
    markerHeight = DEFAULT_MARKER_HEIGHT,
    anchorGap = 0.12,
    fallbackAnchorHeight = DEFAULT_ANCHOR_HEIGHT,
    minBeatBpm = 48,
    maxBeatBpm = 150,
    logger = console,
  } = {}) {
    this.canvasFactory = canvasFactory;
    this.canvasWidth = Math.max(64, Math.round(canvasWidth));
    this.canvasHeight = Math.max(32, Math.round(canvasHeight));
    this.markerWidth = Math.max(0.01, finiteNumber(markerWidth, DEFAULT_MARKER_WIDTH));
    this.markerHeight = Math.max(0.01, finiteNumber(markerHeight, DEFAULT_MARKER_HEIGHT));
    this.anchorGap = Math.max(0, finiteNumber(anchorGap, 0.12));
    this.fallbackAnchorHeight = Math.max(
      0,
      finiteNumber(fallbackAnchorHeight, DEFAULT_ANCHOR_HEIGHT),
    );
    this.minBeatBpm = Math.max(1, finiteNumber(minBeatBpm, 48));
    this.maxBeatBpm = Math.max(
      this.minBeatBpm,
      finiteNumber(maxBeatBpm, 150),
    );
    this.logger = logger;
    this.records = new Map();
    this.disposed = false;
    this.visible = true;
    this.worldScale = new THREE.Vector3();
  }

  register(entity, personId, signalSnapshot = {}) {
    if (this.disposed || !entity?.root?.isObject3D) return false;
    const id = String(personId ?? "").trim();
    if (!id) return false;

    const canvas = this.canvasFactory(this.canvasWidth, this.canvasHeight);
    if (!canvas) {
      this.logger.warn?.(`Unable to create a heartbeat marker canvas for ${id}`);
      return false;
    }
    canvas.width = this.canvasWidth;
    canvas.height = this.canvasHeight;
    const context = canvas.getContext?.("2d");
    if (!context) {
      this.logger.warn?.(`Unable to acquire a 2D marker context for ${id}`);
      return false;
    }

    this.unregister(id);
    const texture = new THREE.CanvasTexture(canvas);
    texture.name = `HeartSignal_${id}`;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      // This is world-anchored UI: follow the person, but do not let awnings,
      // signs or nearby props hide the status badge.
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.name = `UI_HeartSignal_${id}`;
    sprite.center.set(0.5, 0);
    sprite.renderOrder = 90;
    sprite.visible = this.visible;
    sprite.userData.personId = id;
    sprite.userData.kind = "heart-signal";

    const snapshot = normalizeSnapshot(id, signalSnapshot);
    const record = {
      entity,
      personId: id,
      canvas,
      context,
      texture,
      material,
      sprite,
      snapshot,
      renderKey: null,
      redrawCount: 0,
      anchorHeight: modelTopInRootSpace(entity, this.fallbackAnchorHeight),
      baseWidth: this.markerWidth,
      baseHeight: this.markerHeight,
      beatBpm: beatBpmForScore(
        snapshot.heart.heartScore,
        this.minBeatBpm,
        this.maxBeatBpm,
      ),
      phaseOffset: hashPhase(id),
      pulse: 0,
    };

    entity.root.add(sprite);
    this.records.set(id, record);
    this.#redrawIfNeeded(record);
    this.#publishDiagnostics(record);
    this.#updateMarkerTransform(record, 0);
    return true;
  }

  setSignal(personId, signalSnapshot = {}) {
    if (this.disposed) return false;
    const id = String(personId ?? "").trim();
    const record = this.records.get(id);
    if (!record) return false;

    record.snapshot = normalizeSnapshot(id, signalSnapshot, record.snapshot);
    record.beatBpm = beatBpmForScore(
      record.snapshot.heart.heartScore,
      this.minBeatBpm,
      this.maxBeatBpm,
    );
    this.#redrawIfNeeded(record);
    this.#publishDiagnostics(record);
    return true;
  }

  update(elapsedSeconds) {
    if (this.disposed) return;
    const elapsed = Math.max(0, finiteNumber(elapsedSeconds, 0));
    for (const record of this.records.values()) {
      this.#updateMarkerTransform(record, elapsed);
      const diagnostics = record.entity.root.userData.heartSignal;
      if (diagnostics) {
        diagnostics.animation.beatBpm = record.beatBpm;
        diagnostics.animation.pulse = record.pulse;
      }
    }
  }

  getState(personId) {
    const record = this.records.get(String(personId ?? "").trim());
    return record ? cloneState(record) : null;
  }

  getDiagnostics() {
    return [...this.records.values()].map(cloneState);
  }

  has(personId) {
    return this.records.has(String(personId ?? "").trim());
  }

  setVisible(visible) {
    this.visible = Boolean(visible);
    for (const record of this.records.values()) record.sprite.visible = this.visible;
  }

  unregister(personId) {
    const id = String(personId ?? "").trim();
    const record = this.records.get(id);
    if (!record) return false;

    record.sprite.removeFromParent();
    record.material.dispose();
    record.texture.dispose();
    if (record.entity?.root?.userData?.heartSignal?.personId === id) {
      delete record.entity.root.userData.heartSignal;
    }
    this.records.delete(id);
    return true;
  }

  dispose() {
    if (this.disposed) return;
    for (const personId of [...this.records.keys()]) this.unregister(personId);
    this.disposed = true;
  }

  #redrawIfNeeded(record) {
    const nextKey = renderKey(record.snapshot);
    if (nextKey === record.renderKey) return;
    record.renderKey = nextKey;
    drawMarker(record);
  }

  #updateMarkerTransform(record, elapsed) {
    record.entity.root.updateWorldMatrix(true, false);
    record.entity.root.getWorldScale(this.worldScale);
    const scaleX = Math.max(Math.abs(this.worldScale.x), MIN_WORLD_SCALE);
    const scaleY = Math.max(Math.abs(this.worldScale.y), MIN_WORLD_SCALE);

    const inactive = record.snapshot.heart.heartScore === null
      || isInactiveStatus(record.snapshot.status);
    const pulse = inactive ? 0 : heartbeatPulse(elapsed, record.beatBpm, record.phaseOffset);
    const pulseStrength = THREE.MathUtils.lerp(
      0.07,
      0.16,
      finiteNumber(record.snapshot.heart.heartScore, 0) / 100,
    );
    const pulseScale = 1 + pulse * pulseStrength;
    record.pulse = pulse;
    record.sprite.position.set(
      0,
      record.anchorHeight + this.anchorGap / scaleY,
      0,
    );
    record.sprite.scale.set(
      (record.baseWidth * pulseScale) / scaleX,
      (record.baseHeight * pulseScale) / scaleY,
      1,
    );
    record.material.opacity = inactive ? 0.72 : 0.92 + pulse * 0.08;
  }

  #publishDiagnostics(record) {
    record.entity.root.userData.heartSignal = cloneState(record);
  }
}
