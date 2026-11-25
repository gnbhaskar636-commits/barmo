import * as THREE from "three";

export interface Collider {
  x: number;
  z: number;
  w: number;
  d: number;
}

function mat(c: number, r = 0.5, m = 0.2) {
  return new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
}

function glow(c: number, o = 1) {
  const m = new THREE.MeshBasicMaterial({ color: c, transparent: o < 1, opacity: o, depthWrite: o === 1 });
  if (o < 1) m.blending = THREE.AdditiveBlending;
  return m;
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
  o.castShadow = true;
  o.receiveShadow = true;
  if (col) col.push({ x, z, w: w / 2 + 0.35, d: d / 2 + 0.35 });
  return o;
}

interface FloatingElement {
  mesh: THREE.Object3D;
  baseY: number;
  speed: number;
  amp: number;
  rotSpeed: { x: number; y: number; z: number };
  phase: number;
}

/**
 * BARMO 3D UNIVERSE 3.0 — The Main Lounge
 * Upgraded with futuristic floating architecture, anti-gravity levitating furniture,
 * glowing energy rings, holographic displays, and spatial computing aesthetics.
 */
export function buildLounge(sc: THREE.Scene, col: Collider[]) {
  // Deep cosmic background with atmospheric violet-navy fog
  sc.background = new THREE.Color(0x07090e);
  sc.fog = new THREE.Fog(0x07090e, 22, 54);

  const floaters: FloatingElement[] = [];

  // --- 1. Architectural Floating Floor ---
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x111625,
    roughness: 0.28,
    metalness: 0.35,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(25, 19), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  sc.add(floor);

  // Inlaid cyber energy seams on the floor
  const seamMat = glow(0x06b6d4, 0.45);
  const seamX1 = new THREE.Mesh(new THREE.PlaneGeometry(24.8, 0.06), seamMat);
  seamX1.rotation.x = -Math.PI / 2;
  seamX1.position.set(0, 0.015, -4.5);
  const seamX2 = new THREE.Mesh(new THREE.PlaneGeometry(24.8, 0.06), seamMat);
  seamX2.rotation.x = -Math.PI / 2;
  seamX2.position.set(0, 0.015, 3.8);
  sc.add(seamX1, seamX2);

  // Central lounge circular energy dais
  const daisMat = new THREE.MeshStandardMaterial({ color: 0x1a2136, roughness: 0.3, metalness: 0.5 });
  const dais = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.8, 0.08, 48), daisMat);
  dais.position.set(3, 0.04, 1);
  dais.receiveShadow = true;
  sc.add(dais);

  const daisRing = new THREE.Mesh(new THREE.RingGeometry(3.55, 3.75, 48), glow(0x8b5cf6, 0.8));
  daisRing.rotation.x = -Math.PI / 2;
  daisRing.position.set(3, 0.085, 1);
  sc.add(daisRing);

  // Outer floating perimeter trim
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x242e47, roughness: 0.2, metalness: 0.8 });
  sc.add(
    box(25.4, 0.15, 0.2, 0, -0.05, -9.6, rimMat),
    box(25.4, 0.15, 0.2, 0, -0.05, 9.6, rimMat),
    box(0.2, 0.15, 19.4, -12.6, -0.05, 0, rimMat),
    box(0.2, 0.15, 19.4, 12.6, -0.05, 0, rimMat)
  );

  // --- 2. Minimalist Futuristic Walls & Glass Voids ---
  const wallMat = mat(0x0f1422, 0.85, 0.15);
  const brassTrim = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.25, metalness: 0.85 });
  const violetNeon = glow(0x8b5cf6, 0.85);
  const cyanNeon = glow(0x06b6d4, 0.85);

  // North wall with neon edge trims
  sc.add(box(24, 5.5, 0.3, 0, 2.75, -9, wallMat));
  sc.add(box(24, 0.08, 0.34, 0, 5.5, -9, violetNeon));
  sc.add(box(24, 0.05, 0.34, 0, 0.8, -8.95, cyanNeon));

  // West & East architectural panels
  sc.add(box(0.3, 5.5, 18, -12, 2.75, 0, wallMat), box(0.3, 5.5, 18, 12, 2.75, 0, wallMat));

  // Vertical light fins along north wall
  for (let i = -4; i <= 4; i++) {
    sc.add(box(0.12, 5.2, 0.14, i * 2.6, 2.7, -8.8, brassTrim));
    const finGlow = new THREE.Mesh(new THREE.BoxGeometry(0.04, 4.8, 0.04), glow(0x8b5cf6, 0.5));
    finGlow.position.set(i * 2.6, 2.7, -8.72);
    sc.add(finGlow);
  }

  // --- 3. Suspended Cyber Barista Bar ---
  const barMat = mat(0x1c2438, 0.35, 0.4);
  const barTop = mat(0x0e131f, 0.15, 0.7);
  sc.add(
    box(7, 0.95, 1.2, -6, 0.48, -6, barMat, col),
    box(7.2, 0.08, 1.35, -6, 0.98, -6, barTop),
    box(7.25, 0.04, 0.04, -6, 1.0, -5.3, cyanNeon) // Glowing counter edge
  );

  // Floating holographic menu projection above the bar
  const menuGeo = new THREE.PlaneGeometry(2.4, 0.9);
  const menuMesh = new THREE.Mesh(menuGeo, glow(0x06b6d4, 0.4));
  menuMesh.position.set(-6, 2.6, -5.8);
  sc.add(menuMesh);
  floaters.push({
    mesh: menuMesh,
    baseY: 2.6,
    speed: 0.0018,
    amp: 0.06,
    rotSpeed: { x: 0, y: 0.0004, z: 0 },
    phase: 0,
  });

  // --- 4. Anti-Gravity Floating Seating Pods ---
  const sofaMat = mat(0x27334d, 0.7, 0.15);
  const tableMat = mat(0x111624, 0.25, 0.65);

  ([[3, -3], [3, 5], [8, 1]] as const).forEach(([x, z], idx) => {
    // Sofa seats (with collision intact)
    sc.add(
      box(2.6, 0.52, 1, x, 0.28, z - 1.5, sofaMat, col),
      box(2.6, 0.92, 0.3, x, 0.72, z - 1.95, sofaMat)
    );

    // Anti-gravity levitating coffee table
    const tableGroup = new THREE.Group();
    tableGroup.position.set(x, 0.25, z);
    const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.06, 32), tableMat);
    const levRing = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.018, 8, 32), glow(0x06b6d4, 0.75));
    levRing.rotation.x = Math.PI / 2;
    levRing.position.y = -0.12;
    tableGroup.add(tableTop, levRing);
    sc.add(tableGroup);

    // Register table collider
    col.push({ x, z, w: 0.85, d: 0.85 });

    floaters.push({
      mesh: tableGroup,
      baseY: 0.28,
      speed: 0.0015,
      amp: 0.035,
      rotSpeed: { x: 0, y: 0.0008, z: 0 },
      phase: idx * 1.5,
    });
  });

  // High-top social tables with floating accent rings
  ([[-6, 2], [-6, 6]] as const).forEach(([x, z], idx) => {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.08, 32), tableMat);
    t.position.set(x, 0.85, z);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.85), brassTrim);
    post.position.set(x, 0.42, z);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.015, 8, 32), glow(0x8b5cf6, 0.65));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, 0.88, z);
    sc.add(t, post, ring);
    col.push({ x, z, w: 1.25, d: 1.25 });

    floaters.push({
      mesh: ring,
      baseY: 0.88,
      speed: 0.002,
      amp: 0.02,
      rotSpeed: { x: 0, y: 0.002, z: 0 },
      phase: idx * 2.2,
    });
  });

  // Futuristic bio-domes (replacing simple plants)
  ([[-10.5, -7.5], [10.5, -7.5], [10.5, 7.5], [-10.5, 7.5]] as const).forEach(([x, z]) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.32, 0.5, 16), mat(0x1a2236, 0.3, 0.5));
    p.position.set(x, 0.25, z);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.65, 24, 20), new THREE.MeshStandardMaterial({
      color: 0x5ef2c8,
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.35,
    }));
    globe.position.set(x, 0.85, z);
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0), glow(0x06b6d4, 0.8));
    crystal.position.set(x, 0.85, z);
    sc.add(p, globe, crystal);
    col.push({ x, z, w: 0.9, d: 0.9 });

    floaters.push({
      mesh: crystal,
      baseY: 0.85,
      speed: 0.0025,
      amp: 0.05,
      rotSpeed: { x: 0.001, y: 0.003, z: 0.001 },
      phase: x + z,
    });
  });

  // Private meeting booth with glass acoustic shielding
  const glass = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    transparent: true,
    opacity: 0.22,
    roughness: 0.05,
    metalness: 0.9,
  });
  const stoneMat = mat(0x1a2136, 0.4, 0.5);
  sc.add(
    box(3.8, 0.08, 3.4, 8.8, 0.04, -5.7, stoneMat),
    box(3.8, 2.6, 0.08, 8.8, 1.3, -7.4, glass, col),
    box(0.08, 2.6, 3.4, 6.9, 1.3, -5.7, glass, col),
    box(0.08, 2.6, 3.4, 10.7, 1.3, -5.7, glass, col)
  );

  // Booth table and floating chairs
  const pt = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.06, 24), tableMat);
  pt.position.set(8.8, 0.78, -5.7);
  sc.add(pt);
  sc.add(
    box(0.5, 0.5, 0.5, 8, 0.25, -5.1, sofaMat),
    box(0.5, 0.5, 0.5, 9.6, 0.25, -5.1, sofaMat),
    box(0.5, 0.5, 0.5, 8, 0.25, -6.3, sofaMat),
    box(0.5, 0.5, 0.5, 9.6, 0.25, -6.3, sofaMat)
  );

  // Terrace exit portal archway
  sc.add(
    box(0.3, 3.6, 0.3, -1.8, 1.8, 8.4, brassTrim),
    box(0.3, 3.6, 0.3, 1.8, 1.8, 8.4, brassTrim),
    box(3.9, 0.25, 0.3, 0, 3.6, 8.4, brassTrim),
    box(3.3, 0.06, 0.1, 0, 3.45, 8.4, cyanNeon)
  );

  // --- 5. Kinetic Anti-Gravity Polyhedral Crystals ---
  const crystalDefs = [
    { geo: new THREE.IcosahedronGeometry(0.45, 0), pos: [-8, 2.8, -2], color: 0x8b5cf6 },
    { geo: new THREE.OctahedronGeometry(0.4, 0), pos: [5.5, 3.1, -3], color: 0x06b6d4 },
    { geo: new THREE.DodecahedronGeometry(0.38, 0), pos: [-2, 3.2, 4], color: 0xf59e0b },
    { geo: new THREE.IcosahedronGeometry(0.42, 0), pos: [6, 2.9, 5.5], color: 0x8b5cf6 },
  ];

  crystalDefs.forEach((cd, i) => {
    const cMat = new THREE.MeshStandardMaterial({
      color: cd.color,
      roughness: 0.15,
      metalness: 0.85,
      emissive: cd.color,
      emissiveIntensity: 0.35,
    });
    const cMesh = new THREE.Mesh(cd.geo, cMat);
    cMesh.position.set(cd.pos[0], cd.pos[1], cd.pos[2]);
    sc.add(cMesh);

    // Subtle orbital energy ring around each crystal
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.012, 6, 32), glow(cd.color, 0.55));
    ring.rotation.x = Math.PI / 2;
    cMesh.add(ring);

    floaters.push({
      mesh: cMesh,
      baseY: cd.pos[1],
      speed: 0.0016 + i * 0.0003,
      amp: 0.08,
      rotSpeed: { x: 0.0012, y: 0.002 + i * 0.0005, z: 0.0008 },
      phase: i * 1.8,
    });
  });

  // --- 6. Lighting Architecture ---
  // Suspended ceiling pendant orbs with warm gold accents
  for (let i = 0; i < 4; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), glow(0xffe0a8, 1));
    p.position.set(-3.2 + i * 3.5, 4.2, -1);
    sc.add(p);
    const pl = new THREE.PointLight(0xffe0a8, 22, 14, 1.8);
    pl.position.copy(p.position);
    sc.add(pl);
  }

  // Atmospheric ambient & directional lighting
  const amb = new THREE.AmbientLight(0x181e30, 2.2);
  const hemi = new THREE.HemisphereLight(0x8b5cf6, 0x07090e, 1.3);
  const dir = new THREE.DirectionalLight(0xdbeafe, 1.8);
  dir.position.set(-6, 11, 7);
  dir.castShadow = true;
  dir.shadow.mapSize.width = 1024;
  dir.shadow.mapSize.height = 1024;
  dir.shadow.bias = -0.0005;
  sc.add(amb, hemi, dir);

  // Subtle cyan & violet fill lights
  const cyanFill = new THREE.PointLight(0x06b6d4, 16, 15, 2);
  cyanFill.position.set(-7, 2, -4);
  const violetFill = new THREE.PointLight(0x8b5cf6, 16, 15, 2);
  violetFill.position.set(7, 2, 2);
  sc.add(cyanFill, violetFill);

  // --- 7. Automatic Anti-Gravity Physics Animation Hook ---
  // Attaches onBeforeRender so floating objects oscillate naturally every frame
  floor.onBeforeRender = () => {
    const t = performance.now();
    for (let i = 0; i < floaters.length; i++) {
      const f = floaters[i];
      f.mesh.position.y = f.baseY + Math.sin(t * f.speed + f.phase) * f.amp;
      f.mesh.rotation.x += f.rotSpeed.x;
      f.mesh.rotation.y += f.rotSpeed.y;
      f.mesh.rotation.z += f.rotSpeed.z;
    }
  };
}
