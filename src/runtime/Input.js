/**
 * Unified keyboard and pointer-lock input for the 3D world.
 *
 * The controller keeps game logic independent from DOM event timing. Keys are
 * sampled with `isDown`, edge-triggered actions use `justPressed`, and mouse
 * motion is accumulated until the frame consumes it.
 */
export class Input {
  constructor(canvas = null) {
    this.canvas = canvas;
    this.keys = new Set();
    this.justDown = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.pointerLocked = false;
    this.pointerLockEnabled = true;

    this._isTypingTarget = (target) => {
      if (!target) return false;
      const tag = target.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
    };

    this._onKeyDown = (event) => {
      if (this._isTypingTarget(event.target)) return;
      if (!this.keys.has(event.code)) this.justDown.add(event.code);
      this.keys.add(event.code);
    };
    this._onKeyUp = (event) => {
      this.keys.delete(event.code);
    };
    this._onPointerLockChange = () => {
      this.pointerLocked = globalThis.document?.pointerLockElement === this.canvas;
      if (!this.pointerLocked) this.mouseDX = this.mouseDY = 0;
    };
    this._onMouseMove = (event) => {
      if (!this.pointerLocked || !this.pointerLockEnabled) return;
      this.mouseDX += Number(event.movementX) || 0;
      this.mouseDY += Number(event.movementY) || 0;
    };
    this._onCanvasClick = () => {
      if (!this.pointerLockEnabled || this.pointerLocked || !this.canvas) return;
      try {
        const request = this.canvas.requestPointerLock?.();
        request?.catch?.(() => {});
      } catch {
        // Pointer lock can be rejected by browsers when the gesture is stale.
      }
    };
    this._onBlur = () => this.reset();

    globalThis.window?.addEventListener("keydown", this._onKeyDown);
    globalThis.window?.addEventListener("keyup", this._onKeyUp);
    globalThis.window?.addEventListener("blur", this._onBlur);
    globalThis.document?.addEventListener("pointerlockchange", this._onPointerLockChange);
    globalThis.document?.addEventListener("mousemove", this._onMouseMove);
    this.canvas?.addEventListener("click", this._onCanvasClick);
  }

  setPointerLockEnabled(enabled) {
    this.pointerLockEnabled = Boolean(enabled);
    if (!this.pointerLockEnabled) {
      this.mouseDX = this.mouseDY = 0;
      if (this.pointerLocked) globalThis.document?.exitPointerLock?.();
    }
  }

  isDown(code) {
    return this.keys.has(code);
  }

  justPressed(code) {
    return this.justDown.has(code);
  }

  consumeMouseDelta() {
    const delta = { dx: this.mouseDX, dy: this.mouseDY };
    this.mouseDX = this.mouseDY = 0;
    return delta;
  }

  endFrame() {
    this.justDown.clear();
  }

  reset() {
    this.keys.clear();
    this.justDown.clear();
    this.mouseDX = this.mouseDY = 0;
  }

  destroy() {
    globalThis.window?.removeEventListener("keydown", this._onKeyDown);
    globalThis.window?.removeEventListener("keyup", this._onKeyUp);
    globalThis.window?.removeEventListener("blur", this._onBlur);
    globalThis.document?.removeEventListener("pointerlockchange", this._onPointerLockChange);
    globalThis.document?.removeEventListener("mousemove", this._onMouseMove);
    this.canvas?.removeEventListener("click", this._onCanvasClick);
    this.setPointerLockEnabled(false);
    this.reset();
  }
}

