import * as THREE from "three";
import { ZONES } from "@/lib/world/zones";

/**
 * Extra 3D atmosphere layered on top of the original lounge (nothing in
 * lounge.ts is changed): drifting light dust, glowing zone beacons, neon floor
 * trim and a slow holographic crystal over the idea wall.
 */
export function addFx(sc: THREE.Scene) {
  const g = new THREE.Group();
  g.name = "fx";

  // Floating light dust
  const N = 200;
  const pos = new Float32Array(N * 3);
  const spd = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 22;
    pos[i * 3 + 1] = 0.3 + Math.random() * 4.4;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 16;
    spd[i] = 0.08 + Math.random() * 0.18;
  }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(
    dg,
    new THREE.PointsMaterial({ color: 0xe2c590, size: 0.055, transparent: true, opacity: 0.55, depthWrite: false })
  );
  g.add(dust);

  // Zone beacons (floor ring + soft light column)
  const beacons: THREE.Mesh[] = [];
  ZONES.forEach((z, i) => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.95, 1.1, 48),
      new THREE.MeshBasicMaterial({ color: 0xc8a26b, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(z.x, 0.03, z.z);
    ring.userData.phase = i * 1.3;
    g.add(ring);
    beacons.push(ring);
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 0.95, 2.4, 32, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xc8a26b, transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false })
    );
    col.position.set(z.x, 1.2, z.z);
    g.add(col);
  });

  // Neon trim along the walls
  const trimM = new THREE.MeshBasicMaterial({ color: 0xc8a26b });
  const trim = (w: number, d: number, x: number, z: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), trimM);
    m.position.set(x, 0.04, z);
    g.add(m);
  };
  trim(23.4, 0.06, 0, -8.8);
  trim(0.06, 17.6, -11.8, 0);
  trim(0.06, 17.6, 11.8, 0);

  // Holographic crystal over the idea wall
  const crystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.45, 0),
    new THREE.MeshBasicMaterial({ color: 0x8fa3c9, wireframe: true, transparent: true, opacity: 0.85 })
  );
  crystal.position.set(0, 3.2, -8.2);
  g.add(crystal);

  sc.add(g);

  return {
    update(t: number) {
      const a = dg.getAttribute("position") as THREE.BufferAttribute;
      const arr = a.array as Float32Array;
      for (let i = 0; i < N; i++) {
        arr[i * 3 + 1] += spd[i] * 0.016;
        if (arr[i * 3 + 1] > 4.8) arr[i * 3 + 1] = 0.3;
      }
      a.needsUpdate = true;
      beacons.forEach((b) => {
        const m = b.material as THREE.MeshBasicMaterial;
        m.opacity = 0.3 + Math.sin(t * 0.002 + (b.userData.phase as number)) * 0.15;
      });
      crystal.rotation.y = t * 0.0006;
      crystal.rotation.x = t * 0.0004;
      crystal.position.y = 3.2 + Math.sin(t * 0.0015) * 0.12;
    },
    dispose() {
      sc.remove(g);
      g.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material) (m.material as THREE.Material).dispose();
      });
    },
  };
}

/** Animated halo under an avatar. Returns nothing; animated through userData.ringPivot. */
export function addRing(g: THREE.Group, color: number) {
  const pivot = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.42, 0.5, 32, 1, 0, Math.PI * 1.5),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false })
  );
  ring.rotation.x = -Math.PI / 2;
  pivot.position.y = 0.025;
  pivot.add(ring);
  g.add(pivot);
  g.userData.ringPivot = pivot;
}

// =============================================================================
// HIGH-ENERGY VISUAL FX FOR RIGGED LOCOMOTION & COMBAT/ACTIONS
// =============================================================================

export interface DashTrailEmitter {
  update: (dt: number, avatarPos: THREE.Vector3, isSprinting: boolean) => void;
  dispose: () => void;
  getActiveCount: () => number;
}

/**
 * Creates high-energy dash speed trail particle emitter.
 * Spawns electric violet (#8b5cf6) and cyan (#06b6d4) glowing motes behind avatar during sprint.
 */
export function createDashTrail(scene: THREE.Scene, color?: number): DashTrailEmitter {
  const POOL_SIZE = 90;
  const positions = new Float32Array(POOL_SIZE * 3);
  const colors = new Float32Array(POOL_SIZE * 3);
  const lifetimes = new Float32Array(POOL_SIZE); // remaining seconds
  const velocities = new Float32Array(POOL_SIZE * 3);

  const baseCol1 = color ? new THREE.Color(color) : new THREE.Color(0x8b5cf6); // Electric Violet
  const baseCol2 = new THREE.Color(0x06b6d4); // Cyan

  // Initialize all particles inactive below ground
  for (let i = 0; i < POOL_SIZE; i++) {
    positions[i * 3 + 1] = -999;
    lifetimes[i] = 0;
    const c = i % 2 === 0 ? baseCol1 : baseCol2;
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  const geometry = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(positions, 3);
  const colAttr = new THREE.BufferAttribute(colors, 3);
  geometry.setAttribute("position", posAttr);
  geometry.setAttribute("color", colAttr);

  const material = new THREE.PointsMaterial({
    size: 0.16,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const points = new THREE.Points(geometry, material);
  points.name = "DashTrailPoints";
  scene.add(points);

  let nextIdx = 0;
  let spawnAccumulator = 0;

  const update = (dt: number, avatarPos: THREE.Vector3, isSprinting: boolean) => {
    // Spawn new motes when sprinting
    if (isSprinting) {
      spawnAccumulator += dt;
      const spawnInterval = 0.025; // ~40 particles / sec
      while (spawnAccumulator >= spawnInterval) {
        spawnAccumulator -= spawnInterval;
        const i = nextIdx;
        nextIdx = (nextIdx + 1) % POOL_SIZE;

        lifetimes[i] = 0.35; // 350ms duration
        // Spawn slightly behind and around avatar feet
        positions[i * 3] = avatarPos.x + (Math.random() - 0.5) * 0.35;
        positions[i * 3 + 1] = avatarPos.y + 0.08 + Math.random() * 0.3;
        positions[i * 3 + 2] = avatarPos.z + (Math.random() - 0.5) * 0.35;

        // Upward and slight dispersion drift
        velocities[i * 3] = (Math.random() - 0.5) * 0.8;
        velocities[i * 3 + 1] = 0.4 + Math.random() * 0.6;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
      }
    } else {
      spawnAccumulator = 0;
    }

    // Update active particles
    let anyActive = false;
    for (let i = 0; i < POOL_SIZE; i++) {
      if (lifetimes[i] > 0) {
        anyActive = true;
        lifetimes[i] -= dt;
        if (lifetimes[i] <= 0) {
          lifetimes[i] = 0;
          positions[i * 3 + 1] = -999;
        } else {
          positions[i * 3] += velocities[i * 3] * dt;
          positions[i * 3 + 1] += velocities[i * 3 + 1] * dt;
          positions[i * 3 + 2] += velocities[i * 3 + 2] * dt;
        }
      }
    }

    if (isSprinting || anyActive) {
      posAttr.needsUpdate = true;
    }
  };

  const dispose = () => {
    scene.remove(points);
    geometry.dispose();
    material.dispose();
  };

  const getActiveCount = () => {
    let count = 0;
    for (let i = 0; i < POOL_SIZE; i++) {
      if (lifetimes[i] > 0) count++;
    }
    return count;
  };

  return { update, dispose, getActiveCount };
}

export interface FootstepSparkEmitter {
  update: (dt: number, avatarPos: THREE.Vector3, isMoving: boolean) => void;
  trigger: (pos: THREE.Vector3) => void;
  dispose: () => void;
  getActiveCount: () => number;
}

/**
 * Creates footstep spark emitter spawning amber & cyan energetic motes on step cadence.
 */
export function createFootstepSparks(scene: THREE.Scene): FootstepSparkEmitter {
  const POOL_SIZE = 50;
  const positions = new Float32Array(POOL_SIZE * 3);
  const colors = new Float32Array(POOL_SIZE * 3);
  const lifetimes = new Float32Array(POOL_SIZE);
  const velocities = new Float32Array(POOL_SIZE * 3);

  const amber = new THREE.Color(0xf59e0b);
  const cyan = new THREE.Color(0x06b6d4);

  for (let i = 0; i < POOL_SIZE; i++) {
    positions[i * 3 + 1] = -999;
    lifetimes[i] = 0;
    const c = i % 2 === 0 ? amber : cyan;
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  const geometry = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(positions, 3);
  const colAttr = new THREE.BufferAttribute(colors, 3);
  geometry.setAttribute("position", posAttr);
  geometry.setAttribute("color", colAttr);

  const material = new THREE.PointsMaterial({
    size: 0.1,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const points = new THREE.Points(geometry, material);
  points.name = "FootstepSparksPoints";
  scene.add(points);

  let nextIdx = 0;
  let cadenceTimer = 0;
  let footSide = 1;

  const burstAt = (pos: THREE.Vector3, count = 4) => {
    for (let k = 0; k < count; k++) {
      const i = nextIdx;
      nextIdx = (nextIdx + 1) % POOL_SIZE;
      lifetimes[i] = 0.25 + Math.random() * 0.15;
      positions[i * 3] = pos.x + (Math.random() - 0.5) * 0.12;
      positions[i * 3 + 1] = pos.y + 0.04;
      positions[i * 3 + 2] = pos.z + (Math.random() - 0.5) * 0.12;

      velocities[i * 3] = (Math.random() - 0.5) * 1.5;
      velocities[i * 3 + 1] = 0.6 + Math.random() * 0.9;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
    }
  };

  const update = (dt: number, avatarPos: THREE.Vector3, isMoving: boolean) => {
    if (isMoving) {
      cadenceTimer += dt;
      if (cadenceTimer >= 0.28) {
        cadenceTimer = 0;
        footSide *= -1;
        const footPos = avatarPos.clone();
        footPos.x += footSide * 0.14;
        burstAt(footPos, 3);
      }
    } else {
      cadenceTimer = 0;
    }

    let anyActive = false;
    for (let i = 0; i < POOL_SIZE; i++) {
      if (lifetimes[i] > 0) {
        anyActive = true;
        lifetimes[i] -= dt;
        if (lifetimes[i] <= 0) {
          lifetimes[i] = 0;
          positions[i * 3 + 1] = -999;
        } else {
          velocities[i * 3 + 1] -= 9.8 * dt; // gravity
          positions[i * 3] += velocities[i * 3] * dt;
          positions[i * 3 + 1] += velocities[i * 3 + 1] * dt;
          positions[i * 3 + 2] += velocities[i * 3 + 2] * dt;
        }
      }
    }

    if (isMoving || anyActive) {
      posAttr.needsUpdate = true;
    }
  };

  const trigger = (pos: THREE.Vector3) => {
    burstAt(pos, 6);
    posAttr.needsUpdate = true;
  };

  const dispose = () => {
    scene.remove(points);
    geometry.dispose();
    material.dispose();
  };

  const getActiveCount = () => {
    let count = 0;
    for (let i = 0; i < POOL_SIZE; i++) {
      if (lifetimes[i] > 0) count++;
    }
    return count;
  };

  return { update, trigger, dispose, getActiveCount };
}

interface ActiveShockwave {
  mesh: THREE.Mesh;
  scene: THREE.Scene;
  startTime: number;
  duration: number;
  maxScale: number;
}

const activeShockwaves: ActiveShockwave[] = [];

/**
 * Creates expanding glowing torus shockwave ring with additive blending and opacity fade.
 * Triggered on jumps, landing, or special actions.
 */
export function createActionShockwave(
  scene: THREE.Scene,
  position: THREE.Vector3,
  color = 0x8b5cf6
): void {
  const geometry = new THREE.RingGeometry(0.18, 0.32, 32);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(position.x, 0.04, position.z);
  scene.add(mesh);

  activeShockwaves.push({
    mesh,
    scene,
    startTime: performance.now(),
    duration: 500, // 500ms duration
    maxScale: 3.8,
  });
}

/**
 * Updates all active action shockwaves in the scene loop.
 */
export function updateActionShockwaves(): void {
  const now = performance.now();
  for (let i = activeShockwaves.length - 1; i >= 0; i--) {
    const sw = activeShockwaves[i];
    const progress = (now - sw.startTime) / sw.duration;

    if (progress >= 1) {
      sw.scene.remove(sw.mesh);
      sw.mesh.geometry.dispose();
      (sw.mesh.material as THREE.Material).dispose();
      activeShockwaves.splice(i, 1);
    } else {
      const scale = 1 + progress * (sw.maxScale - 1);
      sw.mesh.scale.set(scale, scale, 1);
      const mat = sw.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.9 * (1 - progress);
    }
  }
}

/**
 * Clears and disposes all active action shockwaves.
 */
export function clearActionShockwaves(): void {
  for (const sw of activeShockwaves) {
    sw.scene.remove(sw.mesh);
    sw.mesh.geometry.dispose();
    (sw.mesh.material as THREE.Material).dispose();
  }
  activeShockwaves.length = 0;
}
