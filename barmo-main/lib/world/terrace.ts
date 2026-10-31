import * as THREE from "three";
import { load } from "@/lib/social/store";
import type { Loadout } from "@/lib/economy/catalog";

/** The rooftop sits just south of the lounge gate (the arch at z = 8.4). */
export const TERRACE = { hw: 7, z0: 8.3, z1: 18.6 };
export const onTerrace = (x: number, z: number) => Math.abs(x) <= TERRACE.hw && z > TERRACE.z0 - 0.01 && z <= TERRACE.z1;

const mat = (c: number, r = 0.7, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
const glow = (c: number, o = 1) => new THREE.MeshBasicMaterial({ color: c, transparent: o < 1, opacity: o, depthWrite: o === 1 });
function box(w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  o.position.set(x, y, z);
  return o;
}
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Connected rooftop: wooden deck, brass rail, night skyline with lit windows, a
 * wandering pet that comes over when you are near, and a hoverboard you ride by
 * stepping on it (lift, speed boost, glow). Purely local and additive: nothing
 * is sent over the network and the lounge itself is untouched.
 */
export function addTerrace(sc: THREE.Scene) {
  const g = new THREE.Group();
  g.name = "terrace";
  sc.add(g);
  const brass = mat(0xc8a26b, 0.3, 0.8);
  const lo = load<Loadout>("loadout", {}); // cosmetics bought in the Shop
  const HB: Record<string, [number, number]> = { hb_terminal: [0x08140c, 0x39ff7a], hb_gradient: [0x1a1038, 0xa66bff], hb_tensor: [0x14120a, 0xffc233] };
  const [hbDeck, hbGlow] = HB[lo.hoverboard || ""] || [0x1d2233, 0x8fb4ff];
  const pk = lo.pet || "";
  const FLOAT = pk === "pet_neuron" ? 0.28 : 0;
  const zc = (TERRACE.z0 + TERRACE.z1) / 2,
    zl = TERRACE.z1 - TERRACE.z0;

  // Deck, a threshold strip to the gate, and a rug
  g.add(box(TERRACE.hw * 2, 0.12, zl, 0, -0.06, zc, mat(0x3a2f26, 0.85)));
  g.add(box(3.6, 0.02, 1.2, 0, 0.01, 8.5, mat(0x2a2f3f, 0.4, 0.2)));
  const rug = new THREE.Mesh(new THREE.CircleGeometry(2.4, 36), mat(0x2f4a58, 0.9));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.015, 14);
  g.add(rug);
  // Rail on the left, right and far edges + glowing top trim
  const trim = glow(0xc8a26b);
  g.add(box(0.1, 0.9, zl, -TERRACE.hw, 0.45, zc, brass), box(0.1, 0.9, zl, TERRACE.hw, 0.45, zc, brass), box(TERRACE.hw * 2, 0.9, 0.1, 0, 0.45, TERRACE.z1, brass));
  g.add(box(0.05, 0.04, zl, -TERRACE.hw, 0.92, zc, trim), box(0.05, 0.04, zl, TERRACE.hw, 0.92, zc, trim), box(TERRACE.hw * 2, 0.04, 0.05, 0, 0.92, TERRACE.z1, trim));
  // Lounge chairs, planters, string-light poles
  const seat = mat(0x4a5675, 0.9);
  ([[-4.5, 12], [-4.5, 15], [4.5, 12.5]] as const).forEach(([x, z]) => g.add(box(1.1, 0.4, 1.1, x, 0.2, z, seat), box(1.1, 0.7, 0.2, x, 0.55, z - 0.5, seat)));
  ([[-6.4, 9.3], [6.4, 9.3], [-6.4, 18], [6.4, 18]] as const).forEach(([x, z]) => {
    g.add(box(0.7, 0.5, 0.7, x, 0.25, z, mat(0x2a2f3f)));
    const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), mat(0x4f7a63, 0.8));
    bush.position.set(x, 0.85, z);
    g.add(bush);
  });
  const bulbs = glow(0xffd9a0);
  ([-6, -2, 2, 6] as const).forEach((x) => {
    g.add(box(0.06, 2.6, 0.06, x, 1.3, 17.6, brass));
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), bulbs);
    b.position.set(x, 2.6, 17.6);
    g.add(b);
  });
  const lamp = new THREE.PointLight(0xffd9a0, 22, 12, 1.6);
  lamp.position.set(0, 3, 14);
  g.add(lamp);

  // Skyline: dark towers beyond the far rail with warm lit windows
  const R = rng(7);
  const towers = mat(0x151a2a, 0.95);
  const win: number[] = [];
  for (let i = -5; i <= 5; i++) {
    const w = 3 + R() * 2,
      h = 4 + R() * 9,
      d = 3,
      x = i * 4.4 + (R() - 0.5),
      z = 26 + R() * 4;
    g.add(box(w, h, d, x, h / 2 - 0.5, z, towers));
    for (let k = 0; k < 14; k++) win.push(x + (R() - 0.5) * (w - 0.6), 0.4 + R() * (h - 1.2), z - d / 2 - 0.02);
  }
  ([[-11, 15, 1.8], [11, 19, 2.6]] as const).forEach(([x, z, h]) => g.add(box(5, h, 6, x, h / 2 - 0.5, z, towers)));
  const wg = new THREE.BufferGeometry();
  wg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(win), 3));
  g.add(new THREE.Points(wg, new THREE.PointsMaterial({ color: 0xffd9a0, size: 0.16, transparent: true, opacity: 0.8, depthWrite: false })));

  // Pet: a small round-eared companion
  const pet = new THREE.Group();
  const fur: THREE.Material =
    pk === "pet_byte" ? mat(0x9aa4b5, 0.35, 0.8)
    : pk === "pet_glitch" ? mat(0x2b2147, 0.8)
    : pk === "pet_neuron" ? new THREE.MeshBasicMaterial({ color: 0x5ef2e0, transparent: true, opacity: 0.5, depthWrite: false })
    : mat(0xd9a066, 0.9);
  const eyeC = pk === "pet_byte" ? 0x5ef2e0 : pk === "pet_glitch" ? 0xff4fd8 : pk === "pet_neuron" ? 0xffffff : 0x111111;
  pet.add(box(0.5, 0.3, 0.8, 0, 0.35, 0, fur), box(0.34, 0.3, 0.3, 0, 0.5, 0.5, fur), box(0.08, 0.14, 0.08, -0.12, 0.72, 0.5, fur), box(0.08, 0.14, 0.08, 0.12, 0.72, 0.5, fur));
  pet.add(box(0.05, 0.05, 0.03, -0.08, 0.54, 0.66, glow(eyeC)), box(0.05, 0.05, 0.03, 0.08, 0.54, 0.66, glow(eyeC)));
  if (pk === "pet_byte") pet.add(box(0.03, 0.2, 0.03, 0, 0.85, 0.5, mat(0x9aa4b5, 0.4, 0.8)), box(0.07, 0.07, 0.07, 0, 0.97, 0.5, glow(0x5ef2e0)));
  const tail = new THREE.Group();
  tail.position.set(0, 0.4, -0.4);
  tail.add(box(0.07, 0.07, 0.4, 0, 0, -0.2, fur));
  pet.add(tail);
  pet.position.set(-2, 0, 13);
  g.add(pet);
  let petTx = -2,
    petTz = 13,
    petNext = 0;

  // Hoverboard (home spot on the deck). Step on it to ride.
  const HOME = new THREE.Vector3(3.5, 0.22, 14);
  const board = new THREE.Group();
  board.add(box(1.1, 0.06, 0.42, 0, 0, 0, mat(hbDeck, 0.3, 0.6)), box(1.14, 0.02, 0.46, 0, -0.04, 0, glow(hbGlow, 0.9)));
  const halo = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.62, 32), glow(hbGlow, 0.35));
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = -0.15;
  board.add(halo);
  board.position.copy(HOME);
  g.add(board);
  let riding = false,
    cool = 0,
    lift = 0;

  function update(t: number, dt: number, me: THREE.Object3D) {
    const mx = me.position.x,
      mz = me.position.z;
    // Pet wanders; when I'm on the terrace and close, it trots over and sits near me.
    const near = onTerrace(mx, mz) && Math.hypot(mx - pet.position.x, mz - pet.position.z) < 5;
    if (near) {
      petTx = mx + 0.9;
      petTz = mz + 0.4;
    } else if (t > petNext) {
      petNext = t + 3500 + Math.random() * 3000;
      petTx = (Math.random() - 0.5) * 11;
      petTz = 10 + Math.random() * 7.5;
    }
    const dx = petTx - pet.position.x,
      dz = petTz - pet.position.z,
      dist = Math.hypot(dx, dz);
    const go = dist > (near ? 1.1 : 0.15);
    if (go) {
      const s = Math.min(dist, (near ? 2.6 : 0.9) * dt);
      pet.position.x += (dx / dist) * s;
      pet.position.z += (dz / dist) * s;
      const da = Math.atan2(dx, dz) - pet.rotation.y;
      pet.rotation.y += Math.atan2(Math.sin(da), Math.cos(da)) * Math.min(1, 8 * dt);
    }
    pet.position.y = FLOAT + (FLOAT ? Math.sin(t * 0.003) * 0.05 : 0) + (go ? Math.abs(Math.sin(t * 0.012)) * 0.06 : 0);
    if (pk === "pet_glitch") pet.scale.x = t % 1100 < 70 ? 1.2 : 1;
    tail.rotation.y = Math.sin(t * (near ? 0.02 : 0.006)) * 0.6;

    // Hoverboard: hover when free, mount on step-on, carry me while riding.
    cool -= dt;
    if (!riding) {
      board.position.set(HOME.x, HOME.y + Math.sin(t * 0.003) * 0.05, HOME.z);
      board.rotation.y += dt * 0.6;
      if (cool <= 0 && Math.hypot(mx - HOME.x, mz - HOME.z) < 0.8) riding = true;
      lift += (0 - lift) * Math.min(1, 8 * dt);
    } else {
      if (!onTerrace(mx, mz) || mz < TERRACE.z0 + 0.6) {
        riding = false;
        cool = 2.5;
      } else {
        lift += (0.3 - lift) * Math.min(1, 6 * dt);
        board.position.set(mx, 0.12 + lift * 0.5 + Math.sin(t * 0.006) * 0.03, mz);
        board.rotation.y = me.rotation.y + Math.PI / 2;
      }
    }
    me.position.y += lift; // applied after the avatar's own bob each frame
    (halo.material as THREE.MeshBasicMaterial).opacity = 0.25 + 0.15 * Math.sin(t * 0.005);
  }

  function dispose() {
    sc.remove(g);
    g.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      if (m.material) (m.material as THREE.Material).dispose();
    });
  }

  return { update, dispose, riding: () => riding };
}
