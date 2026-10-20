import * as THREE from "three";

/** The Lumen Orb: an interactive centrepiece. Music equaliser, synced light themes and particle effects. */
export const ORB_POS = { x: -1.5, z: -2.2 };

export type BurstKind = "confetti" | "fireworks" | "bubbles";
export const BURSTS: { id: BurstKind; n: string; icon: string }[] = [
  { id: "confetti", n: "Confetti", icon: "🎉" },
  { id: "fireworks", n: "Fireworks", icon: "🎆" },
  { id: "bubbles", n: "Bubbles", icon: "🫧" },
];

export interface Theme { id: string; n: string; bg: number; tint: number | null; orb: number }
export const THEMES: Theme[] = [
  { id: "midnight", n: "Midnight", bg: 0x0c0f17, tint: null, orb: 0xc8a26b },
  { id: "aurora", n: "Aurora", bg: 0x07191a, tint: 0x5ef2c8, orb: 0x5ef2c8 },
  { id: "sunset", n: "Sunset", bg: 0x20111a, tint: 0xff8a5c, orb: 0xff8a5c },
  { id: "neon", n: "Neon", bg: 0x0d0618, tint: 0xc45cff, orb: 0xc45cff },
];

/** Smoothly re-tints the lounge lights, background and fog. Call before the orb adds its own light. */
export function makeThemeCtl(scene: THREE.Scene) {
  const lights: { l: THREE.Light; base: THREE.Color; target: THREE.Color }[] = [];
  scene.traverse((o) => {
    const l = o as THREE.Light;
    if (l.isLight && l.color) lights.push({ l, base: l.color.clone(), target: l.color.clone() });
  });
  // Each world has its own base colour; the "midnight" theme means "back to this world's own look".
  const base = scene.background instanceof THREE.Color ? scene.background.clone() : new THREE.Color(THEMES[0].bg);
  const bgTarget = base.clone();
  return {
    set(id: string) {
      const t = THEMES.find((x) => x.id === id) || THEMES[0];
      if (t.tint === null) bgTarget.copy(base);
      else bgTarget.setHex(t.bg);
      lights.forEach((e) => {
        e.target.copy(e.base);
        if (t.tint !== null) e.target.lerp(new THREE.Color(t.tint), 0.45);
      });
    },
    update() {
      lights.forEach((e) => e.l.color.lerp(e.target, 0.06));
      if (scene.background instanceof THREE.Color) scene.background.lerp(bgTarget, 0.06);
      if (scene.fog) scene.fog.color.lerp(bgTarget, 0.06);
    },
  };
}

const N = 420;

export function addOrb(scene: THREE.Scene, at: { x: number; z: number } = ORB_POS) {
  const g = new THREE.Group();
  g.position.set(at.x, 0, at.z);
  const metal = new THREE.MeshStandardMaterial({ color: 0x14161d, roughness: 0.3, metalness: 0.7 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xc8a26b, roughness: 0.3, metalness: 0.8 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.9, 0.3, 40), metal);
  base.position.y = 0.15;
  const step = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 0.55, 32), metal);
  step.position.y = 0.55;
  const trim = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.025, 8, 48), brass);
  trim.rotation.x = Math.PI / 2;
  trim.position.y = 0.31;
  g.add(base, step, trim);

  let color = THEMES[0].orb;
  const orbMat = new THREE.MeshStandardMaterial({ color: 0x1b1d26, emissive: color, emissiveIntensity: 1.1, roughness: 0.2, metalness: 0.1 });
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.4, 32, 24), orbMat);
  orb.position.y = 1.45;
  const shellMat = new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.45 });
  const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(0.58, 1), shellMat);
  shell.position.y = 1.45;
  const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 });
  const r1 = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.012, 8, 64), ringMat);
  const r2 = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.01, 8, 64), ringMat);
  r1.position.y = r2.position.y = 1.45;
  const light = new THREE.PointLight(color, 14, 9, 1.8);
  light.position.y = 1.5;
  g.add(orb, shell, r1, r2, light);

  const BARS = 20;
  const barMat = new THREE.MeshBasicMaterial({ color });
  const bars: THREE.Mesh[] = [];
  for (let i = 0; i < BARS; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1, 0.07), barMat);
    const a = (i / BARS) * Math.PI * 2;
    b.position.set(Math.cos(a) * 1.15, 0.03, Math.sin(a) * 1.15);
    g.add(b);
    bars.push(b);
  }
  scene.add(g);

  // ---- particles (world space) ----
  const pos = new Float32Array(N * 3).fill(-100);
  const colr = new Float32Array(N * 3);
  const vel = new Float32Array(N * 3);
  const life = new Float32Array(N);
  const grav = new Float32Array(N);
  let head = 0;
  const pg = new THREE.BufferGeometry();
  pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  pg.setAttribute("color", new THREE.BufferAttribute(colr, 3));
  const pm = new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false });
  const pts = new THREE.Points(pg, pm);
  pts.frustumCulled = false;
  scene.add(pts);
  const tmp = new THREE.Color();

  const spawn = (x: number, y: number, z: number, vx: number, vy: number, vz: number, c: number, l: number, gr: number) => {
    const i = head++ % N;
    pos.set([x, y, z], i * 3);
    vel.set([vx, vy, vz], i * 3);
    tmp.setHex(c);
    colr.set([tmp.r, tmp.g, tmp.b], i * 3);
    life[i] = l;
    grav[i] = gr;
  };
  const queue: { at: number; fn: () => void }[] = [];
  const rnd = (a: number, b: number) => a + Math.random() * (b - a);
  const PAL = [0xff5a7a, 0xffd34d, 0x5ef2c8, 0x6bb5ff, 0xc45cff, 0xffffff];

  function burst(kind: BurstKind) {
    const ox = at.x, oz = at.z;
    if (kind === "confetti") {
      for (let i = 0; i < 140; i++) {
        const a = Math.random() * Math.PI * 2, s = rnd(0.8, 3);
        spawn(ox, 1.9, oz, Math.cos(a) * s, rnd(3, 6.5), Math.sin(a) * s, PAL[i % PAL.length], rnd(2.4, 3.6), -5);
      }
    } else if (kind === "fireworks") {
      for (let k = 0; k < 4; k++) {
        queue.push({
          at: performance.now() + k * 420,
          fn: () => {
            const cx = ox + rnd(-2.2, 2.2), cz = oz + rnd(-2.2, 2.2), cy = rnd(3.2, 4.4), c = PAL[Math.floor(Math.random() * PAL.length)];
            for (let i = 0; i < 80; i++) {
              const th = Math.random() * Math.PI * 2, ph = Math.acos(rnd(-1, 1)), s = rnd(1.6, 3.2);
              spawn(cx, cy, cz, Math.sin(ph) * Math.cos(th) * s, Math.cos(ph) * s, Math.sin(ph) * Math.sin(th) * s, c, rnd(1.1, 1.9), -1.6);
            }
          },
        });
      }
    } else {
      for (let i = 0; i < 70; i++) {
        const a = Math.random() * Math.PI * 2, r = rnd(0.2, 2.2);
        spawn(ox + Math.cos(a) * r, rnd(0.2, 1.2), oz + Math.sin(a) * r, rnd(-0.2, 0.2), rnd(0.5, 1.3), rnd(-0.2, 0.2), 0xa8dcff, rnd(3, 5), 0.05);
      }
    }
  }

  function setColor(c: number) {
    color = c;
    orbMat.emissive.setHex(c);
    shellMat.color.setHex(c);
    ringMat.color.setHex(c);
    barMat.color.setHex(c);
    light.color.setHex(c);
  }

  return {
    group: g,
    pos: g.position,
    burst,
    setColor,
    update(t: number, dt: number, level: number, bands: number[], active: boolean) {
      const pulse = 1 + level * 0.3;
      orb.scale.setScalar(pulse);
      orbMat.emissiveIntensity = 1.1 + level * 2.2;
      light.intensity = 14 + level * 34;
      shell.rotation.y = t * 0.0006;
      shell.rotation.x = t * 0.0004;
      shell.scale.setScalar(1 + level * 0.15);
      r1.rotation.set(Math.PI / 2 + Math.sin(t * 0.0008) * 0.5, t * 0.0009, 0);
      r2.rotation.set(Math.sin(t * 0.0006) * 0.7, t * -0.0007, Math.PI / 3);
      orb.position.y = shell.position.y = 1.45 + Math.sin(t * 0.0018) * 0.06;
      bars.forEach((b, i) => {
        const v = active ? bands[i] ?? 0 : 0.06 + (Math.sin(t * 0.002 + i * 0.6) + 1) * 0.04;
        const h = 0.05 + v * 1.5;
        b.scale.y = h;
        b.position.y = 0.02 + h / 2;
      });
      const now = performance.now();
      for (let i = queue.length - 1; i >= 0; i--) {
        if (queue[i].at <= now) {
          queue[i].fn();
          queue.splice(i, 1);
        }
      }
      for (let i = 0; i < N; i++) {
        if (life[i] <= 0) {
          pos[i * 3 + 1] = -100;
          continue;
        }
        life[i] -= dt;
        vel[i * 3 + 1] += grav[i] * dt;
        pos[i * 3] += vel[i * 3] * dt + (grav[i] > 0 ? Math.sin(t * 0.003 + i) * 0.004 : 0);
        pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
        pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
        if (pos[i * 3 + 1] < 0.02 && grav[i] < 0) {
          pos[i * 3 + 1] = 0.02;
          vel[i * 3] *= 0.7;
          vel[i * 3 + 1] = 0;
          vel[i * 3 + 2] *= 0.7;
        }
      }
      (pg.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
      (pg.getAttribute("color") as THREE.BufferAttribute).needsUpdate = true;
    },
    dispose() {
      scene.remove(g);
      scene.remove(pts);
      g.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material) (m.material as THREE.Material).dispose();
      });
      pg.dispose();
      pm.dispose();
    },
  };
}
