import * as THREE from "three";

/** Camera and movement controls: the rules, the settings and their saved values. Pure logic, tested. */
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

/**
 * Phone-motion look: change between two readings of the phone's orientation (degrees).
 * alpha = compass turn (wraps at 360), beta = tilt forward/back. Returns radians; big jumps are ignored.
 */
export function gyroDelta(prev: { a: number; b: number } | null, cur: { a: number; b: number }): { dYaw: number; dPitch: number } {
  if (!prev) return { dYaw: 0, dPitch: 0 };
  const da = ((cur.a - prev.a + 540) % 360) - 180;
  const db = cur.b - prev.b;
  if (Math.abs(da) > 45 || Math.abs(db) > 45) return { dYaw: 0, dPitch: 0 };
  return { dYaw: (da * Math.PI) / 180, dPitch: (db * Math.PI) / 180 };
}

// =============================================================================
// DYNAMIC CAMERA TRAUMA, FOV RUSH & COLLISION ZOOM GUARD
// =============================================================================

export interface RoomBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY?: number;
  maxY?: number;
  margin?: number;
}

let cameraTrauma = 0;

/**
 * Adds camera trauma in range [0, 1].
 * Shake intensity equals trauma squared (nonlinear feel).
 */
export function applyCameraTrauma(traumaAmount: number): void {
  if (typeof traumaAmount !== "number" || !Number.isFinite(traumaAmount)) return;
  cameraTrauma = clamp(cameraTrauma + traumaAmount, 0, 1);
}

/** Returns the current camera trauma level [0, 1]. */
export function getCameraTrauma(): number {
  return cameraTrauma;
}

/** Resets camera trauma to 0. */
export function resetCameraTrauma(): void {
  cameraTrauma = 0;
}

export interface CameraDynamicsResult {
  shakeOffset: THREE.Vector3;
  fov: number;
  trauma: number;
}

/**
 * Updates dynamic camera effects:
 * - Dynamic FOV rush: expands by +4 degrees when sprinting.
 * - Trauma decay and rotational/positional camera shake based on trauma^2.
 */
export function updateCameraDynamics(
  camera: THREE.PerspectiveCamera,
  isSprinting: boolean,
  dt: number,
  baseFov = 55
): CameraDynamicsResult {
  // FOV rush: +4 deg when sprinting
  const targetFov = isSprinting ? baseFov + 4 : baseFov;
  camera.fov += (targetFov - camera.fov) * Math.min(1, 8 * dt);
  camera.updateProjectionMatrix();

  // Trauma decay: ~1.25 units / sec
  if (cameraTrauma > 0) {
    const stepDt = typeof dt === "number" && Number.isFinite(dt) ? dt : 0.016;
    cameraTrauma = Math.max(0, cameraTrauma - stepDt * 1.25);
  }
  if (!Number.isFinite(cameraTrauma)) {
    cameraTrauma = 0;
  }

  // Trauma squared for high-energy organic shake feel
  const shakeIntensity = cameraTrauma * cameraTrauma;
  const shakeOffset = new THREE.Vector3(
    (Math.random() - 0.5) * 0.12 * shakeIntensity,
    (Math.random() - 0.5) * 0.12 * shakeIntensity,
    (Math.random() - 0.5) * 0.12 * shakeIntensity
  );

  return { shakeOffset, fov: camera.fov, trauma: cameraTrauma };
}

/**
 * Collision zoom guard: checks if the third-person camera position would clip
 * through room walls. If collision is detected, clamps the camera along the ray
 * from targetPos (avatar) to cameraPos, keeping a safe margin inside the room.
 */
export function checkRoomBoundaryCollision(
  cameraPos: THREE.Vector3,
  targetPos: THREE.Vector3,
  roomBounds: RoomBounds
): THREE.Vector3 {
  const margin = typeof roomBounds.margin === "number" ? roomBounds.margin : 0.45;
  const minX = roomBounds.minX + margin;
  const maxX = roomBounds.maxX - margin;
  const minZ = roomBounds.minZ + margin;
  const maxZ = roomBounds.maxZ - margin;

  // If camera is already well inside bounds, no collision correction needed
  if (
    cameraPos.x >= minX &&
    cameraPos.x <= maxX &&
    cameraPos.z >= minZ &&
    cameraPos.z <= maxZ
  ) {
    return cameraPos.clone();
  }

  const dir = new THREE.Vector3().subVectors(cameraPos, targetPos);
  const totalDist = dir.length();
  if (totalDist < 1e-4) return cameraPos.clone();
  dir.normalize();

  // Ray-box intersection from targetPos to find closest wall entry
  let maxT = totalDist;

  if (dir.x > 1e-5) {
    const t = (maxX - targetPos.x) / dir.x;
    if (t >= 0 && t < maxT) maxT = t;
  } else if (dir.x < -1e-5) {
    const t = (minX - targetPos.x) / dir.x;
    if (t >= 0 && t < maxT) maxT = t;
  }

  if (dir.z > 1e-5) {
    const t = (maxZ - targetPos.z) / dir.z;
    if (t >= 0 && t < maxT) maxT = t;
  } else if (dir.z < -1e-5) {
    const t = (minZ - targetPos.z) / dir.z;
    if (t >= 0 && t < maxT) maxT = t;
  }

  // Safe clamped camera position (guaranteed not to exceed wall intersection maxT)
  const safeDist = Math.min(totalDist, maxT);
  const safeX = clamp(targetPos.x + dir.x * safeDist, minX, maxX);
  const safeZ = clamp(targetPos.z + dir.z * safeDist, minZ, maxZ);
  return new THREE.Vector3(
    safeX,
    cameraPos.y,
    safeZ
  );
}
