// ---------------------------------------------------------------------------
// lib/performance/memory.ts — WebGL Memory Cleanup Manager
// Phase 19 – Performance & Security Hardening
// ---------------------------------------------------------------------------

/** Anything that exposes a `dispose()` method (Three.js geometries, materials, textures …). */
export interface Disposable {
  dispose(): void;
}

/** Snapshot returned by `ResourceTracker.getStats()`. */
export interface ResourceTrackerStats {
  /** Number of resources currently tracked. */
  tracked: number;
  /** Cumulative count of resources disposed since creation. */
  totalDisposed: number;
}

// ── ResourceTracker --------------------------------------------------------

/**
 * Tracks allocated GPU-side resources (geometries, materials, textures) so
 * they can be batch-disposed on route changes or component unmounts.
 */
export class ResourceTracker {
  private readonly _resources: Set<Disposable> = new Set();
  private _totalDisposed = 0;

  /** Start tracking a resource.  Returns the resource for chaining. */
  track<T extends Disposable>(resource: T): T {
    if (resource && typeof resource.dispose === "function") {
      this._resources.add(resource);
    }
    return resource;
  }

  /** Stop tracking a resource without disposing it. */
  untrack(resource: Disposable): void {
    if (resource) {
      this._resources.delete(resource);
    }
  }

  /** Dispose every tracked resource and clear the set. */
  disposeAll(): void {
    for (const r of this._resources) {
      try {
        r.dispose();
      } catch {
        // Swallow – the resource may already have been freed externally.
      }
      this._totalDisposed++;
    }
    this._resources.clear();
  }

  /** Current tracking statistics. */
  getStats(): ResourceTrackerStats {
    return {
      tracked: this._resources.size,
      totalDisposed: this._totalDisposed,
    };
  }
}

// ── utility functions ------------------------------------------------------

/**
 * Returns a cleanup function suitable for Next.js route-transition hooks
 * (`useEffect` return value or `routeChangeStart` handler).
 *
 * Usage:
 * ```ts
 * const tracker = new ResourceTracker();
 * // … track resources …
 * useEffect(() => createRouteCleanupHook(tracker), []);
 * ```
 */
export function createRouteCleanupHook(tracker?: ResourceTracker): () => void {
  return () => {
    tracker?.disposeAll();
  };
}

/**
 * Estimate GPU memory consumed by a single uncompressed texture.
 *
 * | format  | bytes / pixel |
 * |---------|---------------|
 * | RGBA    | 4             |
 * | RGB     | 3             |
 * | RGBAFloat | 16          |
 * | RGFloat | 8             |
 * | Alpha / Luminance | 1   |
 */
export function estimateTextureMemory(
  width: number,
  height: number,
  format: string = "RGBA",
): number {
  const w =
    typeof width === "number" && Number.isFinite(width) && width > 0
      ? Math.round(width)
      : 0;
  const h =
    typeof height === "number" && Number.isFinite(height) && height > 0
      ? Math.round(height)
      : 0;

  const bytesPerPixel: Record<string, number> = Object.create(null) as Record<
    string,
    number
  >;
  bytesPerPixel["RGBA"] = 4;
  bytesPerPixel["RGB"] = 3;
  bytesPerPixel["RGBAFloat"] = 16;
  bytesPerPixel["RGFloat"] = 8;
  bytesPerPixel["Alpha"] = 1;
  bytesPerPixel["Luminance"] = 1;

  const bpp =
    bytesPerPixel[format] ??
    bytesPerPixel["RGBA"]!; /* default to RGBA if unknown */
  return w * h * bpp;
}

/**
 * Returns `true` when estimated used memory exceeds the threshold (both in
 * megabytes).  Default threshold: 512 MB.
 */
export function isMemoryPressure(
  usedMB: number,
  thresholdMB: number = 512,
): boolean {
  const used =
    typeof usedMB === "number" && Number.isFinite(usedMB) ? usedMB : 0;
  const threshold =
    typeof thresholdMB === "number" && Number.isFinite(thresholdMB) && thresholdMB > 0
      ? thresholdMB
      : 512;
  return used >= threshold;
}
