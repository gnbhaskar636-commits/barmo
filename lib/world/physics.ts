import type { RoomId } from "@/lib/world/rooms";

/** Base Earth-standard gravitational constant in m/s² */
export const GRAVITY_BASE = 9.8;

export interface SectorGravityConfig {
  gravityFactor: number;
  gravityScale: number;
  jumpImpulse: number;
  jumpVelocity: number;
  floatDamping: number;
  driftDamping: number;
  maxFallSpeed: number;
  terminalVelocity: number;
}

export type SectorPhysicsConfig = SectorGravityConfig;

const CONFIG_LOUNGE: SectorGravityConfig = {
  gravityFactor: 0.85,
  gravityScale: 0.85,
  jumpImpulse: 1.1,
  jumpVelocity: 1.1,
  floatDamping: 0.91,
  driftDamping: 0.91,
  maxFallSpeed: 9.5,
  terminalVelocity: -9.5,
};

const SECTOR_CONFIGS: Record<RoomId, SectorGravityConfig> = {
  cosmos: {
    gravityFactor: 0.25,
    gravityScale: 0.25,
    jumpImpulse: 1.8,
    jumpVelocity: 1.8,
    floatDamping: 0.98,
    driftDamping: 0.98,
    maxFallSpeed: 4.0,
    terminalVelocity: -4.0,
  },
  lab: {
    gravityFactor: 0.50,
    gravityScale: 0.50,
    jumpImpulse: 1.5,
    jumpVelocity: 1.5,
    floatDamping: 0.96,
    driftDamping: 0.96,
    maxFallSpeed: 5.5,
    terminalVelocity: -5.5,
  },
  arena: {
    gravityFactor: 0.65,
    gravityScale: 0.65,
    jumpImpulse: 1.3,
    jumpVelocity: 1.3,
    floatDamping: 0.94,
    driftDamping: 0.94,
    maxFallSpeed: 7.5,
    terminalVelocity: -7.5,
  },
  raceway: {
    gravityFactor: 0.70,
    gravityScale: 0.70,
    jumpImpulse: 1.25,
    jumpVelocity: 1.25,
    floatDamping: 0.93,
    driftDamping: 0.93,
    maxFallSpeed: 8.0,
    terminalVelocity: -8.0,
  },
  party: {
    gravityFactor: 0.80,
    gravityScale: 0.80,
    jumpImpulse: 1.15,
    jumpVelocity: 1.15,
    floatDamping: 0.92,
    driftDamping: 0.92,
    maxFallSpeed: 9.0,
    terminalVelocity: -9.0,
  },
  meeting: {
    gravityFactor: 0.85,
    gravityScale: 0.85,
    jumpImpulse: 1.1,
    jumpVelocity: 1.1,
    floatDamping: 0.91,
    driftDamping: 0.91,
    maxFallSpeed: 9.5,
    terminalVelocity: -9.5,
  },
  lounge: CONFIG_LOUNGE,
};

/**
 * Returns the sector gravity and kinematic damping profile for a given room.
 */
export function getSectorGravityConfig(roomId: RoomId | string | null | undefined): SectorGravityConfig {
  if (!roomId) return CONFIG_LOUNGE;
  return SECTOR_CONFIGS[roomId as RoomId] || CONFIG_LOUNGE;
}

/**
 * Computes effective gravitational acceleration (g_eff = g_base * factor) in m/s².
 */
export function computeEffectiveGravity(roomId: RoomId | string | null | undefined): number {
  const cfg = getSectorGravityConfig(roomId);
  return Number((GRAVITY_BASE * cfg.gravityFactor).toFixed(4));
}

/**
 * Parametric vertical anti-gravity floating oscillation.
 * Formula: baseY + Math.sin(timeMs * speed + phase) * amplitude.
 */
export function calculateAntiGravityY(
  baseY: number,
  timeMs: number,
  speed: number,
  phase: number,
  amplitude: number
): number {
  return baseY + Math.sin(timeMs * speed + phase) * amplitude;
}

/**
 * Analytical jump apex height: h = v0^2 / (2 * g)
 */
export function jumpApexHeight(v0: number, g: number): number {
  if (v0 <= 0 || g <= 0) return 0;
  return Number(((v0 * v0) / (2 * g)).toFixed(4));
}

/**
 * Analytical jump hang time: t = (2 * v0) / g
 */
export function jumpHangTime(v0: number, g: number): number {
  if (v0 <= 0 || g <= 0) return 0;
  return Number(((2 * v0) / g).toFixed(4));
}

/**
 * Discrete Euler step integration for vertical kinematics.
 */
export function stepJumpKinematics(
  y: number,
  vy: number,
  g: number,
  dt: number,
  terminalVy = -15
): { y: number; vy: number; isGrounded: boolean } {
  let nextVy = vy - g * dt;
  if (nextVy < terminalVy) nextVy = terminalVy;
  let nextY = y + nextVy * dt;
  if (nextY <= 0) {
    return { y: 0, vy: 0, isGrounded: true };
  }
  return { y: nextY, vy: nextVy, isGrounded: false };
}

/**
 * Exponential air drift damping for mid-air horizontal motion.
 */
export function applyAirDriftDamping(
  vx: number,
  vz: number,
  damping: number,
  dt: number
): { vx: number; vz: number } {
  const factor = Math.pow(damping, dt * 60);
  return { vx: vx * factor, vz: vz * factor };
}

/**
 * Ground friction damping for rapid ground stoppage.
 */
export function applyGroundFriction(
  vx: number,
  vz: number,
  friction: number,
  dt: number
): { vx: number; vz: number } {
  const factor = Math.max(0, 1 - friction * dt * 60);
  return { vx: vx * factor, vz: vz * factor };
}

/**
 * Clamps particle count budget within allowable bounds [min, max].
 */
export function clampParticleCount(n: number, min = 20, max = 500): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

/**
 * Computes Float32Array buffer sizes for particle positions and colors.
 */
export function computeParticleBufferSize(budget: number): { positions: number; colors: number } {
  const clamped = clampParticleCount(budget);
  return {
    positions: clamped * 3,
    colors: clamped * 3,
  };
}

/**
 * Advances a single particle Y position upward with ceiling wrap-around.
 */
export function advanceParticleY(
  y: number,
  speed: number,
  dt: number,
  floor = 0.3,
  ceiling = 4.8
): number {
  let next = y + speed * dt;
  if (next > ceiling) next = floor;
  return next;
}

/**
 * Converts a 24-bit hex color to normalized RGB components [0.0, 1.0].
 */
export function hexToRgbNormalized(hex: number): [number, number, number] {
  const r = ((hex >> 16) & 0xff) / 255;
  const g = ((hex >> 8) & 0xff) / 255;
  const b = (hex & 0xff) / 255;
  return [
    Number(r.toFixed(4)),
    Number(g.toFixed(4)),
    Number(b.toFixed(4)),
  ];
}

/** Graphics quality particle presets */
export const PARTICLE_PRESETS = {
  performance: 120,
  balanced: 350,
  ultra: 800,
} as const;

/**
 * Retrieves particle count scaled by graphics preset and sector gravity.
 */
export function getParticleCount(
  preset: "performance" | "balanced" | "ultra",
  roomId?: RoomId | string | null
): number {
  const base = PARTICLE_PRESETS[preset] || PARTICLE_PRESETS.balanced;
  if (!roomId) return base;
  // Cosmos and Raceway have slightly higher particle motes for atmosphere
  if (roomId === "cosmos") return Math.round(base * 1.25);
  if (roomId === "raceway") return Math.round(base * 1.15);
  return base;
}

/**
 * In-place update helper for buoyant particle buffers.
 */
export function updateBuoyantParticles(
  positions: Float32Array,
  speeds: Float32Array,
  dt: number,
  floor = 0.3,
  ceiling = 4.8
): void {
  const count = speeds.length;
  for (let i = 0; i < count; i++) {
    const idx = i * 3 + 1; // Y component
    let y = positions[idx] + speeds[i] * dt;
    if (y > ceiling) y = floor;
    positions[idx] = y;
  }
}
