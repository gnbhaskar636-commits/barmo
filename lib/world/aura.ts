import * as THREE from "three";

/**
 * Tech/AI auras that orbit an avatar (children of the avatar group, so they follow it).
 * aura_attention: ring of nodes linked by pulsing "attention" lines.
 * aura_stream: tokens rising in a spiral.  aura_latent: nodes orbiting tilted rings.
 */
export function addAura(g: THREE.Group, id: string) {
  const root = new THREE.Group();
  g.add(root);
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const keep = <T extends THREE.BufferGeometry | THREE.Material>(x: T): T => {
    (x instanceof THREE.BufferGeometry ? geos : mats).push(x as never);
    return x;
  };
  let tick: (t: number) => void = () => {};

  if (id === "aura_attention") {
    const N = 10;
    const dot = keep(new THREE.SphereGeometry(0.045, 8, 6));
    const dm = keep(new THREE.MeshBasicMaterial({ color: 0x5ef2e0 }));
    const nodes = Array.from({ length: N }, () => {
      const m = new THREE.Mesh(dot, dm);
      root.add(m);
      return m;
    });
    const pairs: [number, number][] = [];
    for (let i = 0; i < N; i++) pairs.push([i, (i + 1) % N]);
    for (let i = 0; i < N / 2; i++) pairs.push([i, i + N / 2]);
    const pos = new Float32Array(pairs.length * 6);
    const lg = keep(new THREE.BufferGeometry());
    lg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const lm = keep(new THREE.LineBasicMaterial({ color: 0x5ef2e0, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
    const ls = new THREE.LineSegments(lg, lm);
    ls.frustumCulled = false;
    root.add(ls);
    tick = (t) => {
      nodes.forEach((n, i) => {
        const a = t * 0.0008 + (i / N) * Math.PI * 2;
        n.position.set(Math.cos(a) * 0.62, 1.25 + Math.sin(t * 0.002 + i) * 0.12, Math.sin(a) * 0.62);
      });
      pairs.forEach(([a, b], k) => {
        nodes[a].position.toArray(pos, k * 6);
        nodes[b].position.toArray(pos, k * 6 + 3);
      });
      lg.attributes.position.needsUpdate = true;
      lm.opacity = 0.35 + 0.25 * Math.sin(t * 0.003);
    };
  } else if (id === "aura_stream") {
    const N = 48;
    const pos = new Float32Array(N * 3);
    const an = Float32Array.from({ length: N }, () => Math.random() * 6.28);
    const sp = Float32Array.from({ length: N }, () => 0.4 + Math.random() * 0.7);
    const ph = Float32Array.from({ length: N }, () => Math.random() * 2.1);
    const rr = Float32Array.from({ length: N }, () => 0.3 + Math.random() * 0.3);
    const pg = keep(new THREE.BufferGeometry());
    pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const pm = keep(new THREE.PointsMaterial({ color: 0x7cf6a8, size: 0.07, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    const pts = new THREE.Points(pg, pm);
    pts.frustumCulled = false;
    root.add(pts);
    tick = (t) => {
      for (let i = 0; i < N; i++) {
        const y = (ph[i] + t * 0.001 * sp[i]) % 2.1;
        const a = an[i] + t * 0.0006;
        pos[i * 3] = Math.cos(a) * rr[i];
        pos[i * 3 + 1] = y;
        pos[i * 3 + 2] = Math.sin(a) * rr[i];
      }
      pg.attributes.position.needsUpdate = true;
    };
  } else {
    const ring = keep(new THREE.TorusGeometry(0.7, 0.008, 6, 48));
    const rm = keep(new THREE.MeshBasicMaterial({ color: 0xc45cff, transparent: true, opacity: 0.5 }));
    const dot = keep(new THREE.SphereGeometry(0.06, 8, 6));
    const dm = keep(new THREE.MeshBasicMaterial({ color: 0xe9c6ff }));
    const orbs = [0, 1, 2].map((k) => {
      const pivot = new THREE.Group();
      pivot.position.y = 1.2;
      pivot.rotation.set(k * 1.05, k * 0.7, 0);
      pivot.add(new THREE.Mesh(ring, rm));
      const o = new THREE.Mesh(dot, dm);
      pivot.add(o);
      root.add(pivot);
      return o;
    });
    tick = (t) => orbs.forEach((o, k) => {
      const a = t * 0.0015 * (1 + k * 0.4) + k * 2;
      o.position.set(Math.cos(a) * 0.7, Math.sin(a) * 0.7, 0);
    });
  }

  return {
    root,
    update: tick,
    dispose() {
      g.remove(root);
      geos.forEach((x) => x.dispose());
      mats.forEach((x) => x.dispose());
    },
  };
}
