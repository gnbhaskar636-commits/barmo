/** Camera and movement controls: the rules, the settings and their saved values. Pure logic (no three.js), so it can be tested. */
export interface CamControls {
  /** How fast dragging turns the camera (0.4 to 2.5). */
  sens: number;
  /** Flip up/down for looking. */
  invertY: boolean;
  /** Old style: the camera stays behind you and A / D turn you. Off = free camera (recommended). */
  classic: boolean;
  /** The camera swings back behind you while you walk. */
  follow: boolean;
}
export const DEFAULT_CTL: CamControls = { sens: 1, invertY: false, classic: false, follow: false };
const KEY = "barmo-controls";

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const PITCH_MIN = 0.08;
export const PITCH_MAX = 1.25;
export const PITCH_DEFAULT = 0.42;
export const ZOOM_MIN = 0.45;
export const ZOOM_MAX = 2.2;

export function cleanControls(o: unknown): CamControls {
  const x = (o && typeof o === "object" ? o : {}) as Partial<Record<keyof CamControls, unknown>>;
  return {
    sens: typeof x.sens === "number" && isFinite(x.sens) ? clamp(x.sens, 0.4, 2.5) : 1,
    invertY: x.invertY === true,
    classic: x.classic === true,
    follow: x.follow === true,
  };
}
export function loadControls(): CamControls {
  try {
    return cleanControls(JSON.parse(localStorage.getItem(KEY) || "{}"));
  } catch {
    return { ...DEFAULT_CTL };
  }
}
export function saveControls(c: CamControls) {
  try {
    localStorage.setItem(KEY, JSON.stringify(cleanControls(c)));
  } catch {
    /* ignore */
  }
}

export type CamMode = "follow" | "first" | "top";
export const CAM_MODES: CamMode[] = ["follow", "first", "top"];
export const CAM_LABEL: Record<CamMode, string> = { follow: "Follow", first: "First person", top: "Top view" };
export const nextCamMode = (m: CamMode): CamMode => CAM_MODES[(CAM_MODES.indexOf(m) + 1) % CAM_MODES.length];

/**
 * Which way to walk. `f` is forward/back input and `s` is right/left input (-1 to 1, from keys or the stick),
 * `camYaw` is the direction the camera is looking. Returns a unit direction in x/z and how hard to push (0 to 1).
 */
export function moveVector(f: number, s: number, camYaw: number): { x: number; z: number; amt: number } {
  const mag = Math.hypot(f, s);
  if (mag < 1e-4) return { x: 0, z: 0, amt: 0 };
  const k = Math.max(1, mag);
  const iz = f / k;
  const ix = s / k;
  const dx = Math.sin(camYaw) * iz - Math.cos(camYaw) * ix;
  const dz = Math.cos(camYaw) * iz + Math.sin(camYaw) * ix;
  const len = Math.hypot(dx, dz) || 1;
  return { x: dx / len, z: dz / len, amt: Math.min(1, mag) };
}

/** Where the camera sits relative to what it looks at (orbiting at yaw/pitch, `dist` away). */
export function orbitOffset(yaw: number, pitch: number, dist: number) {
  return { x: -Math.sin(yaw) * Math.cos(pitch) * dist, y: Math.sin(pitch) * dist, z: -Math.cos(yaw) * Math.cos(pitch) * dist };
}
