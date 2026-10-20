import * as THREE from "three";

export interface Collider {
  x: number;
  z: number;
  w: number;
  d: number;
}

function mat(c: number, r = 0.7, m = 0) {
  return new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
}

function box(
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  m: THREE.Material,
  col?: Collider[]
) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  o.position.set(x, y, z);
  if (col) col.push({ x, z, w: w / 2 + 0.35, d: d / 2 + 0.35 });
  return o;
}

/** The shared 3D lounge. Imported from the original BARMO HTML untouched. */
export function buildLounge(sc: THREE.Scene, col: Collider[]) {
  sc.background = new THREE.Color(0x0c0f17);
  sc.fog = new THREE.Fog(0x0c0f17, 18, 42);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 18), mat(0x2a2f3f, 0.35, 0.2));
  floor.rotation.x = -Math.PI / 2;
  sc.add(floor);
  const rug = new THREE.Mesh(new THREE.CircleGeometry(3.2, 40), mat(0x3a3326, 0.9));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(3, 0.01, 1);
  sc.add(rug);
  const wall = mat(0x1d2233, 0.9),
    br = mat(0xc8a26b, 0.3, 0.8);
  sc.add(box(24, 5, 0.3, 0, 2.5, -9, wall), box(0.3, 5, 18, -12, 2.5, 0, wall), box(0.3, 5, 18, 12, 2.5, 0, wall));
  for (let i = -4; i <= 4; i++) sc.add(box(0.12, 5, 0.12, i * 2.6, 2.5, -8.8, br));
  sc.add(box(7, 0.9, 1.2, -6, 0.45, -6, mat(0x3b4258, 0.5), col), box(7.1, 0.06, 1.3, -6, 0.93, -6, br));
  const sofa = mat(0x4a5675, 0.9),
    tab = mat(0x14161d, 0.3, 0.6);
  ([[3, -3], [3, 5], [8, 1]] as const).forEach(([x, z]) => {
    sc.add(box(2.6, 0.5, 1, x, 0.25, z - 1.5, sofa, col), box(2.6, 0.9, 0.3, x, 0.7, z - 1.95, sofa), box(1, 0.4, 1, x, 0.2, z, tab, col));
  });
  ([[-6, 2], [-6, 6]] as const).forEach(([x, z]) => {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.08, 32), tab);
    t.position.set(x, 0.8, z);
    sc.add(t);
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.8), br);
    l.position.set(x, 0.4, z);
    sc.add(l);
    col.push({ x, z, w: 1.2, d: 1.2 });
  });
  ([[-10.5, -7.5], [10.5, -7.5], [10.5, 7.5], [-10.5, 7.5]] as const).forEach(([x, z]) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.3, 0.6, 12), mat(0x2a2f3f));
    p.position.set(x, 0.3, z);
    const l = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 1), mat(0x4f7a63, 0.8));
    l.position.set(x, 1.2, z);
    sc.add(p, l);
    col.push({ x, z, w: 0.8, d: 0.8 });
  });
  const gl = new THREE.MeshStandardMaterial({ color: 0x8fa3c9, transparent: true, opacity: 0.18, roughness: 0.1 }),
    stone = mat(0x3a3326, 0.8);
  sc.add(
    box(3.8, 0.06, 3.4, 8.8, 0.03, -5.7, stone),
    box(3.8, 2.4, 0.08, 8.8, 1.2, -7.4, gl, col),
    box(0.08, 2.4, 3.4, 6.9, 1.2, -5.7, gl, col),
    box(0.08, 2.4, 3.4, 10.7, 1.2, -5.7, gl, col)
  );
  const pt = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.06, 24), tab);
  pt.position.set(8.8, 0.75, -5.7);
  sc.add(pt);
  sc.add(
    box(0.5, 0.5, 0.5, 8, 0.25, -5.1, sofa),
    box(0.5, 0.5, 0.5, 9.6, 0.25, -5.1, sofa),
    box(0.5, 0.5, 0.5, 8, 0.25, -6.3, sofa),
    box(0.5, 0.5, 0.5, 9.6, 0.25, -6.3, sofa)
  );
  sc.add(box(3, 0.5, 0.1, -6, 2.5, -8.7, br), box(0.3, 3.4, 0.3, -1.8, 1.7, 8.4, br), box(0.3, 3.4, 0.3, 1.8, 1.7, 8.4, br), box(3.9, 0.3, 0.3, 0, 3.4, 8.4, br));
  for (let i = 0; i < 4; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), new THREE.MeshBasicMaterial({ color: 0xe2c590 }));
    p.position.set(-3 + i * 3.4, 4, -1);
    sc.add(p);
    const pl = new THREE.PointLight(0xffd9a0, 28, 16, 1.6);
    pl.position.copy(p.position);
    sc.add(pl);
  }
  sc.add(new THREE.AmbientLight(0xa4acd0, 1.9));
  sc.add(new THREE.HemisphereLight(0xc9d2ff, 0x2a2f3f, 1.1));
  const d = new THREE.DirectionalLight(0xd6deff, 1.6);
  d.position.set(-5, 9, 6);
  sc.add(d);
}
