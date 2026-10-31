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
