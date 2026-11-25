/**
 * 3-Tier Graphics Settings Engine for BARMO 3D UNIVERSE 3.0
 *
 * Supports Performance Mode, Balanced Mode, and Ultra Graphics.
 * Automatically chooses a sensible default based on device capabilities and respects reduced motion.
 */

export type GraphicsPreset = "performance" | "balanced" | "ultra";

export interface GraphicsConfig {
  preset: GraphicsPreset;
  label: string;
  blurb: string;
  pixelRatioCap: number;
  shadows: boolean;
  shadowMapSize: number;
  bloom: boolean;
  bloomStrength: number;
  bloomRadius: number;
  particles: number;
  volumetrics: boolean;
  antialias: boolean;
  postprocessing: boolean;
}

export const GRAPHICS_PRESETS: Record<GraphicsPreset, GraphicsConfig> = {
  performance: {
    preset: "performance",
    label: "Performance",
    blurb: "Fastest frame rate. Best for older phones and battery saving.",
    pixelRatioCap: 1.0,
    shadows: false,
    shadowMapSize: 512,
    bloom: false,
    bloomStrength: 0,
    bloomRadius: 0,
    particles: 120,
    volumetrics: false,
    antialias: false,
    postprocessing: false,
  },
  balanced: {
    preset: "balanced",
    label: "Balanced",
    blurb: "Smooth 60 FPS with soft lighting and subtle environmental glow.",
    pixelRatioCap: 1.5,
    shadows: true,
    shadowMapSize: 1024,
    bloom: true,
    bloomStrength: 0.35,
    bloomRadius: 0.4,
    particles: 350,
    volumetrics: true,
    antialias: true,
    postprocessing: true,
  },
  ultra: {
    preset: "ultra",
    label: "Ultra",
    blurb: "Full spatial computing visual fidelity, crisp PBR reflections, dynamic bloom and rich particle fields.",
    pixelRatioCap: 2.0,
    shadows: true,
    shadowMapSize: 2048,
    bloom: true,
    bloomStrength: 0.65,
    bloomRadius: 0.6,
    particles: 800,
    volumetrics: true,
    antialias: true,
    postprocessing: true,
  },
};

const STORAGE_KEY = "barmo_graphics_preset";

export function detectDeviceDefaultPreset(): GraphicsPreset {
  if (typeof window === "undefined") return "balanced";

  // Check prefers-reduced-motion
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return "performance";
  }

  const nav = navigator as Navigator & { deviceMemory?: number; hardwareConcurrency?: number };
  const cores = nav.hardwareConcurrency || 4;
  const memory = nav.deviceMemory || 4; // GB

  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth < 640;

  if (isMobile) {
    // High-end mobile (8+ cores, 6+ GB RAM)
    if (cores >= 8 && memory >= 6) return "balanced";
    return "performance";
  }

  // Desktop
  if (cores >= 8 && memory >= 8) return "ultra";
  if (cores >= 4 && memory >= 4) return "balanced";
  return "performance";
}

export function loadGraphicsPreset(): GraphicsPreset {
  if (typeof window === "undefined") return "balanced";
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as GraphicsPreset | null;
    if (saved && (saved === "performance" || saved === "balanced" || saved === "ultra")) {
      return saved;
    }
  } catch {
    // Ignore storage errors
  }
  return detectDeviceDefaultPreset();
}

export function saveGraphicsPreset(preset: GraphicsPreset): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, preset);
    window.dispatchEvent(new CustomEvent("barmo_graphics_change", { detail: preset }));
  } catch {
    // Ignore storage errors
  }
}

export function getGraphicsConfig(preset?: GraphicsPreset): GraphicsConfig {
  const p = preset || loadGraphicsPreset();
  return GRAPHICS_PRESETS[p] || GRAPHICS_PRESETS.balanced;
}
