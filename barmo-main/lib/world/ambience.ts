import * as THREE from "three";
import type { Mood } from "@/lib/world/scenes";

/**
 * Extra life for every world: drifting light motes (in the worlds that have none) and
 * glowing ripples that roll out from the music source on every beat.
 * Visual only. Wrapped in try/catch by the caller so it can never block the lounge.
 */
export function addAmbience(scene: THREE.Scene, origin: { x: number; z: number }, baseColor: number, withMotes: boolean) {
  const g = new THREE.Group();
  g.name = "ambience";
  scene.add(g);

  // --- motes ---
  const N = withMotes ? 160 : 0;
  const pos = new Float32Array(N * 3);
  const spd = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 18;
    pos[i * 3 + 1] = 0.3 + Math.random() * 4.2;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 15;
    spd[i] = 0.08 + Math.random() * 0.2;
  }
  const mg = new THREE.BufferGeometry();
  mg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mm = new THREE.PointsMaterial({ color: baseColor, size: 0.06, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending });
  const motes = new THREE.Points(mg, mm);
  motes.frustumCulled = false;
  if (N) g.add(motes);

  // --- beat ripples (a small pool of rings, reused) ---
  const POOL = 5;
  const geo = new THREE.RingGeometry(0.92, 1, 64);
  const rings = Array.from({ length: POOL }, () => {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: baseColor, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(origin.x, 0.05, origin.z);
    m.visible = false;
    g.add(m);
    return { m, age: 9 };
  });
  let next = 0;
  let prevBeat = 0;
  let lastFire = 0;
  const col = new THREE.Color(baseColor);

  return {
    update(t: number, dt: number, mood: Mood) {
      const target = mood.scene ? mood.scene.accent : baseColor;
      col.lerp(new THREE.Color(target), 0.05);
      mm.color.copy(col);
      mm.opacity = 0.35 + Math.min(0.4, mood.level * 0.6);
      const sp = mood.reduce ? 0.3 : 1 + mood.level * 2.5;
      for (let i = 0; i < N; i++) {
        pos[i * 3 + 1] += spd[i] * dt * sp;
        pos[i * 3] += Math.sin(t * 0.0004 + i) * 0.0018;
        if (pos[i * 3 + 1] > 4.8) pos[i * 3 + 1] = 0.2;
      }
      if (N) (mg.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;

      if (mood.scene && !mood.reduce && mood.beat.beat > prevBeat + 0.3 && t - lastFire > 180) {
        lastFire = t;
        const r = rings[next++ % POOL];
        r.age = 0;
        r.m.visible = true;
        (r.m.material as THREE.MeshBasicMaterial).color.copy(col);
      }
      prevBeat = mood.beat.beat;
      rings.forEach((r) => {
        if (!r.m.visible) return;
        r.age += dt;
        const k = r.age / 1.5;
        if (k >= 1) {
          r.m.visible = false;
          return;
        }
        const s = 0.6 + k * (mood.scene ? 4 + mood.scene.punch * 5 : 6);
        r.m.scale.set(s, s, s);
        (r.m.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.55;
      });
    },
    dispose() {
      scene.remove(g);
      mg.dispose();
      mm.dispose();
      geo.dispose();
      rings.forEach((r) => (r.m.material as THREE.Material).dispose());
    },
  };
}
