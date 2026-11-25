// ---------------------------------------------------------------------------
// lib/performance/renderer.ts — Adaptive DPR & WebGL Performance Manager
// Phase 19 – Performance & Security Hardening
// ---------------------------------------------------------------------------

/** Quality tiers ordered from lowest to highest fidelity. */
export type QualityTier = "low" | "medium" | "high" | "ultra";

/** Configuration returned by `createInstanceBatch`. */
export interface InstanceBatch {
  /** Number of instances to draw in a single call. */
  count: number;
  /** Identifier / path of the shared template geometry. */
  templateGeometry: string;
  /** Whether hardware instancing should be enabled. */
  useInstancing: boolean;
  /** Maximum instances the GPU buffer is sized for. */
  maxInstances: number;
}

// ── helpers ----------------------------------------------------------------

const clamp = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, v));

const safePositive = (v: unknown, fallback: number): number => {
  if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) return fallback;
  return v;
};

// ── pure utility functions -------------------------------------------------

/**
 * Compute an adaptive device-pixel-ratio that keeps the frame rate near
 * `targetFPS`.  Scales DPR down (min 0.5) when FPS drops and back up
 * (max `devicePixelRatio`) when headroom exists.
 */
export function computeAdaptiveDPR(
  currentFPS: number,
  targetFPS: number = 30,
): number {
  const nativeDPR =
    typeof globalThis.devicePixelRatio === "number" &&
    Number.isFinite(globalThis.devicePixelRatio)
      ? globalThis.devicePixelRatio
      : 1;
  const fps = safePositive(currentFPS, 0);
  const target = safePositive(targetFPS, 30);

  if (fps <= 0) return 0.5; // no data → safest setting

  const ratio = fps / target;
  // Scale DPR proportionally, with smoothing (sqrt) to avoid oscillation.
  const scaled = nativeDPR * Math.sqrt(clamp(ratio, 0, 1));
  return clamp(Math.round(scaled * 100) / 100, 0.5, nativeDPR);
}

/**
 * Build an instanced-rendering configuration for `count` repeated 3-D
 * objects sharing `templateGeometry`.
 */
export function createInstanceBatch(
  count: number,
  templateGeometry: string,
): InstanceBatch {
  const safeCount = Math.max(1, Math.round(safePositive(count, 1)));
  const geo = typeof templateGeometry === "string" ? templateGeometry : "";

  return {
    count: safeCount,
    templateGeometry: geo,
    useInstancing: safeCount > 1,
    // Round up to next power-of-two for GPU buffer alignment.
    maxInstances: Math.pow(2, Math.ceil(Math.log2(safeCount))),
  };
}

/**
 * Rough estimate of VRAM usage (in MB) for a single framebuffer at the
 * given resolution and DPR.  Assumes RGBA8 (4 bytes/pixel).
 */
export function estimateVRAM(
  width: number,
  height: number,
  dpr: number,
): number {
  const w = safePositive(width, 0);
  const h = safePositive(height, 0);
  const d = safePositive(dpr, 1);
  return (w * d * (h * d) * 4) / (1024 * 1024);
}

/**
 * Decide a quality tier based on measured FPS and estimated VRAM pressure.
 *
 * | Tier     | Condition                               |
 * |----------|-----------------------------------------|
 * | ultra    | fps ≥ 55 AND vram < 256 MB              |
 * | high     | fps ≥ 40 AND vram < 512 MB              |
 * | medium   | fps ≥ 25                                |
 * | low      | everything else                         |
 */
export function shouldReduceQuality(fps: number, vram: number): QualityTier {
  const f = safePositive(fps, 0);
  const v = typeof vram === "number" && Number.isFinite(vram) ? vram : Infinity;

  if (f >= 55 && v < 256) return "ultra";
  if (f >= 40 && v < 512) return "high";
  if (f >= 25) return "medium";
  return "low";
}

/**
 * Returns a LOD level (0 = highest detail, 3 = lowest) based on the
 * object's distance from the camera.
 */
export function computeLODLevel(
  distance: number,
  maxDistance: number = 1000,
): number {
  const d = safePositive(distance, 0);
  const max = safePositive(maxDistance, 1000);
  const ratio = clamp(d / max, 0, 1);

  if (ratio < 0.25) return 0;
  if (ratio < 0.5) return 1;
  if (ratio < 0.75) return 2;
  return 3;
}

/**
 * Wraps `callback` so it fires at most `targetFPS` times per second using
 * `requestAnimationFrame` when available, falling back to `setTimeout`.
 *
 * Returns a **stop** function that cancels the loop.
 */
export function throttleRenderLoop(
  callback: () => void,
  targetFPS: number = 60,
): () => void {
  if (typeof callback !== "function") {
    return () => {
      /* noop */
    };
  }

  const interval = 1000 / safePositive(targetFPS, 60);
  let lastTime = 0;
  let running = true;
  let handle: number | ReturnType<typeof setTimeout> = 0;

  const hasRAF = typeof requestAnimationFrame === "function";

  const tick = (now?: number) => {
    if (!running) return;
    const ts = typeof now === "number" ? now : Date.now();
    if (ts - lastTime >= interval) {
      lastTime = ts;
      callback();
    }
    if (hasRAF) {
      handle = requestAnimationFrame(tick);
    } else {
      handle = setTimeout(() => tick(Date.now()), interval);
    }
  };

  tick(0);

  return () => {
    running = false;
    if (hasRAF) {
      cancelAnimationFrame(handle as number);
    } else {
      clearTimeout(handle as ReturnType<typeof setTimeout>);
    }
  };
}

// ── AdaptiveRenderer class -------------------------------------------------

/**
 * Stateful manager that continuously monitors FPS and adjusts DPR to keep
 * the frame rate near a target.
 */
export class AdaptiveRenderer {
  private _targetFPS: number;
  private _currentDPR: number;
  private _fpsHistory: number[] = [];
  private readonly _historySize: number;

  constructor(targetFPS: number = 30, historySize: number = 10) {
    this._targetFPS = safePositive(targetFPS, 30);
    this._historySize = Math.max(1, Math.round(safePositive(historySize, 10)));
    this._currentDPR =
      typeof globalThis.devicePixelRatio === "number"
        ? globalThis.devicePixelRatio
        : 1;
  }

  /** Record a new FPS sample and return the recommended DPR. */
  update(fps: number): number {
    const f = safePositive(fps, 0);
    this._fpsHistory.push(f);
    if (this._fpsHistory.length > this._historySize) {
      this._fpsHistory.shift();
    }

    const avg =
      this._fpsHistory.reduce((a, b) => a + b, 0) / this._fpsHistory.length;
    this._currentDPR = computeAdaptiveDPR(avg, this._targetFPS);
    return this._currentDPR;
  }

  /** Current recommended DPR. */
  get dpr(): number {
    return this._currentDPR;
  }

  /** Current target FPS. */
  get targetFPS(): number {
    return this._targetFPS;
  }

  set targetFPS(value: number) {
    this._targetFPS = safePositive(value, 30);
  }
}
