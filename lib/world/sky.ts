import * as THREE from "three";

const DAY_BG = new THREE.Color(0x9cc7f0);
const MOON = new THREE.Color(0xdfe6ff);
const SUN = new THREE.Color(0xffe08a);

interface L {
  l: THREE.Light;
  kind: "p" | "d" | "a";
  saved: number;
}

/**
 * Day / night. Works AROUND the Lumen Orb themes: each frame it blends the sky,
 * fog and light strengths toward "day", renders, then puts the exact theme values
 * back, so the orb's own colour fades never fight it. Adds a sun/moon disc and stars.
 */
export function addSky(sc: THREE.Scene, startDay: boolean) {
  const lights: L[] = [];
  sc.traverse((o) => {
    const l = o as THREE.Light;
    if (!l.isLight) return;
    lights.push({ l, saved: l.intensity, kind: (l as THREE.PointLight).isPointLight ? "p" : (l as THREE.DirectionalLight).isDirectionalLight ? "d" : "a" });
  });
  const g = new THREE.Group();
  g.name = "sky";
  const disc = new THREE.Mesh(new THREE.CircleGeometry(2.2, 32), new THREE.MeshBasicMaterial({ color: MOON, fog: false }));
  disc.position.set(-14, 17, 42);
  disc.rotation.y = Math.PI;
  g.add(disc);
  const N = 160;
  const p = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI,
      r = 46;
    p[i * 3] = Math.cos(a) * r * (Math.random() < 0.5 ? -1 : 1) * 0.9;
    p[i * 3 + 1] = 12 + Math.random() * 22;
    p[i * 3 + 2] = Math.sin(a) * r * 0.9;
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute("position", new THREE.BufferAttribute(p, 3));
  const sm = new THREE.PointsMaterial({ color: 0xffffff, size: 0.18, transparent: true, opacity: 0.9, depthWrite: false, fog: false });
  g.add(new THREE.Points(sg, sm));
  sc.add(g);

  let day = startDay;
  let k = startDay ? 1 : 0;
  const bgSaved = new THREE.Color();
  const fogSaved = new THREE.Color();

  return {
    isDay: () => day,
    toggle() {
      day = !day;
      return day;
    },
    apply(dt: number) {
      k += ((day ? 1 : 0) - k) * Math.min(1, 2.5 * dt);
      if (k < 0.004 && !day) k = 0;
      (disc.material as THREE.MeshBasicMaterial).color.copy(MOON).lerp(SUN, k);
      disc.scale.setScalar(1 + 0.6 * k);
      sm.opacity = 0.9 * (1 - k);
      if (k === 0) return;
      if (sc.background instanceof THREE.Color) {
        bgSaved.copy(sc.background);
        sc.background.lerp(DAY_BG, k);
      }
      if (sc.fog) {
        fogSaved.copy(sc.fog.color);
        sc.fog.color.lerp(DAY_BG, k);
      }
      for (const e of lights) {
        e.saved = e.l.intensity;
        e.l.intensity = e.saved * (e.kind === "p" ? 1 - 0.75 * k : e.kind === "d" ? 1 + 0.6 * k : 1 + 0.5 * k);
      }
    },
    /** Call right after render: puts the theme's own values back. */
    restore() {
      if (k === 0) return;
      if (sc.background instanceof THREE.Color) sc.background.copy(bgSaved);
      if (sc.fog) sc.fog.color.copy(fogSaved);
      for (const e of lights) e.l.intensity = e.saved;
    },
    dispose() {
      sc.remove(g);
      disc.geometry.dispose();
      (disc.material as THREE.Material).dispose();
      sg.dispose();
      sm.dispose();
    },
  };
}
