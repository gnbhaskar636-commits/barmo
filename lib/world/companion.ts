import * as THREE from "three";

const m = (c: number, met = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.4, metalness: met });
const glow = (c: number, o = 1) => new THREE.MeshBasicMaterial({ color: c, transparent: o < 1, opacity: o, depthWrite: o === 1 });
const box = (w: number, h: number, d: number, x: number, y: number, z: number, mt: THREE.Material) => {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mt);
  o.position.set(x, y, z);
  return o;
};

/** Small pet that follows a player around the lounge (the three tech pets from the Shop). */
export function makeCompanion(id: string): THREE.Group {
  const g = new THREE.Group();
  if (id === "pet_neuron") {
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), glow(0x5ef2e0, 0.55)));
    g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 1), new THREE.MeshBasicMaterial({ color: 0x9ffcf0, wireframe: true, transparent: true, opacity: 0.6 })));
    g.userData.float = 0.95;
    return g;
  }
  const glitch = id === "pet_glitch";
  const body = glitch ? m(0x2b2147) : m(0x9aa4b5, 0.8);
  const eye = glow(glitch ? 0xff4fd8 : 0x5ef2e0);
  g.add(box(0.28, 0.2, 0.44, 0, 0.2, 0, body), box(0.2, 0.18, 0.2, 0, 0.32, 0.26, body));
  g.add(box(0.04, 0.04, 0.02, -0.05, 0.34, 0.37, eye), box(0.04, 0.04, 0.02, 0.05, 0.34, 0.37, eye));
  if (glitch) g.add(box(0.05, 0.09, 0.05, -0.07, 0.46, 0.26, body), box(0.05, 0.09, 0.05, 0.07, 0.46, 0.26, body));
  else g.add(box(0.02, 0.14, 0.02, 0, 0.5, 0.26, body), box(0.05, 0.05, 0.05, 0, 0.58, 0.26, eye));
  return g;
}

/** Trot to a spot just behind-right of the owner. Call every frame. */
export function followPet(pet: THREE.Group, owner: THREE.Object3D, t: number, dt: number) {
  const yaw = owner.rotation.y;
  const tx = owner.position.x - Math.sin(yaw) * 0.9 + Math.cos(yaw) * 0.55;
  const tz = owner.position.z - Math.cos(yaw) * 0.9 - Math.sin(yaw) * 0.55;
  const dx = tx - pet.position.x,
    dz = tz - pet.position.z;
  const k = Math.min(1, 3 * dt);
  pet.position.x += dx * k;
  pet.position.z += dz * k;
  const moving = Math.hypot(dx, dz) > 0.15;
  const fl = (pet.userData.float as number) || 0;
  pet.position.y = fl ? fl + Math.sin(t * 0.003) * 0.06 : moving ? Math.abs(Math.sin(t * 0.012)) * 0.05 : 0;
  if (moving) {
    const da = Math.atan2(dx, dz) - pet.rotation.y;
    pet.rotation.y += Math.atan2(Math.sin(da), Math.cos(da)) * Math.min(1, 8 * dt);
  }
}

export function disposeCompanion(g: THREE.Group) {
  g.traverse((o) => {
    const x = o as THREE.Mesh;
    if (x.geometry) x.geometry.dispose();
    if (x.material) (x.material as THREE.Material).dispose();
  });
}
