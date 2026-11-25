"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { loadGraphicsPreset } from "@/lib/world/graphicsQuality";

export default function Hero3DCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Check WebGL availability
    let glAvailable = false;
    try {
      const c = document.createElement("canvas");
      glAvailable = !!(c.getContext("webgl") || c.getContext("experimental-webgl"));
    } catch {
      glAvailable = false;
    }
    if (!glAvailable) return;

    const preset = loadGraphicsPreset();
    const isMobile = window.innerWidth < 768;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06080e);
    scene.fog = new THREE.FogExp2(0x06080e, 0.022);

    const camera = new THREE.PerspectiveCamera(52, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.set(0, 2.2, 7.8);

    const renderer = new THREE.WebGLRenderer({ antialias: preset !== "performance", alpha: false, powerPreference: "high-performance" });
    const dpr = Math.min(window.devicePixelRatio || 1, preset === "ultra" ? 2 : preset === "balanced" ? 1.5 : 1);
    renderer.setPixelRatio(dpr);
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    mount.appendChild(renderer.domElement);

    // --- 1. Ambient & Directional Lighting ---
    const amb = new THREE.AmbientLight(0x161b2e, 2.2);
    const hemi = new THREE.HemisphereLight(0x8b5cf6, 0x06080e, 1.4);
    const mainLight = new THREE.DirectionalLight(0xe0e7ff, 2.4);
    mainLight.position.set(5, 8, 5);
    scene.add(amb, hemi, mainLight);

    const violetLight = new THREE.PointLight(0x8b5cf6, 28, 14, 2);
    violetLight.position.set(-4, 3, 1);
    const cyanLight = new THREE.PointLight(0x06b6d4, 28, 14, 2);
    cyanLight.position.set(4, 3, -1);
    scene.add(violetLight, cyanLight);

    // --- 2. Floating Anti-Gravity Architectural Platforms ---
    const platGroup = new THREE.Group();
    scene.add(platGroup);

    const platMat = new THREE.MeshStandardMaterial({
      color: 0x111625,
      roughness: 0.22,
      metalness: 0.75,
    });
    const edgeMat = new THREE.MeshBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.85 });
    const cyanEdgeMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.85 });

    // Main suspended hexagonal dais
    const mainDaisGeo = new THREE.CylinderGeometry(3.8, 4.1, 0.35, 6);
    const mainDais = new THREE.Mesh(mainDaisGeo, platMat);
    mainDais.position.set(1.5, -0.6, 0);
    platGroup.add(mainDais);

    // Glowing rim around dais
    const ringGeo = new THREE.RingGeometry(3.85, 4.05, 6);
    const ringMesh = new THREE.Mesh(ringGeo, edgeMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.set(1.5, -0.41, 0);
    platGroup.add(ringMesh);

    // Secondary hovering satellite platforms
    const subDais1 = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 0.2, 6), platMat);
    subDais1.position.set(-3.6, 0.2, -1.8);
    const subRing1 = new THREE.Mesh(new THREE.RingGeometry(1.42, 1.58, 6), cyanEdgeMat);
    subRing1.rotation.x = -Math.PI / 2;
    subRing1.position.set(-3.6, 0.31, -1.8);
    platGroup.add(subDais1, subRing1);

    const subDais2 = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.0, 0.25, 6), platMat);
    subDais2.position.set(4.2, 1.0, -3.2);
    const subRing2 = new THREE.Mesh(new THREE.RingGeometry(1.82, 1.98, 6), edgeMat);
    subRing2.rotation.x = -Math.PI / 2;
    subRing2.position.set(4.2, 1.13, -3.2);
    platGroup.add(subDais2, subRing2);

    // --- 3. Kinetic Anti-Gravity Geometric Crystals ---
    interface Crystal {
      mesh: THREE.Mesh;
      baseY: number;
      speed: number;
      amp: number;
      rx: number;
      ry: number;
      rz: number;
    }
    const crystals: Crystal[] = [];

    const crystalDefs = [
      { geo: new THREE.IcosahedronGeometry(0.7, 0), pos: [1.5, 1.6, 0], col: 0x8b5cf6, em: 0x7c3aed },
      { geo: new THREE.OctahedronGeometry(0.5, 0), pos: [-3.6, 1.6, -1.8], col: 0x06b6d4, em: 0x0891b2 },
      { geo: new THREE.DodecahedronGeometry(0.55, 0), pos: [4.2, 2.6, -3.2], col: 0xf59e0b, em: 0xd97706 },
      { geo: new THREE.OctahedronGeometry(0.35, 0), pos: [-1.2, 2.8, 1.2], col: 0x06b6d4, em: 0x0891b2 },
      { geo: new THREE.IcosahedronGeometry(0.32, 0), pos: [3.4, 0.1, 2.2], col: 0x8b5cf6, em: 0x7c3aed },
    ];

    crystalDefs.forEach((cd, i) => {
      const cMat = new THREE.MeshStandardMaterial({
        color: cd.col,
        emissive: cd.em,
        emissiveIntensity: 0.55,
        roughness: 0.15,
        metalness: 0.85,
      });
      const cMesh = new THREE.Mesh(cd.geo, cMat);
      cMesh.position.set(cd.pos[0], cd.pos[1], cd.pos[2]);
      scene.add(cMesh);

      // Orbital energy ring around central crystal
      if (i === 0) {
        const energyRing = new THREE.Mesh(
          new THREE.TorusGeometry(1.2, 0.02, 16, 64),
          new THREE.MeshBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.75 })
        );
        energyRing.rotation.x = Math.PI / 3;
        cMesh.add(energyRing);
      }

      crystals.push({
        mesh: cMesh,
        baseY: cd.pos[1],
        speed: 0.0014 + i * 0.0004,
        amp: 0.12 + i * 0.03,
        rx: 0.0015 + i * 0.0003,
        ry: 0.0022 + i * 0.0005,
        rz: 0.001,
      });
    });

    // --- 4. Atmospheric Cosmic Particle Field ---
    const particleCount = isMobile ? 250 : preset === "ultra" ? 650 : 400;
    const posArray = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      posArray[i] = (Math.random() - 0.5) * 22;
      posArray[i + 1] = Math.random() * 12 - 2;
      posArray[i + 2] = (Math.random() - 0.5) * 18;
    }
    const partGeo = new THREE.BufferGeometry();
    partGeo.setAttribute("position", new THREE.BufferAttribute(posArray, 3));
    const partMat = new THREE.PointsMaterial({
      color: 0x8b5cf6,
      size: isMobile ? 0.05 : 0.07,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(partGeo, partMat);
    scene.add(particles);

    // --- 5. Interactive Mouse Parallax Physics ---
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const onPointerMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", onPointerMove, { passive: true });

    // Handle Resize
    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    // --- 6. Animation Loop with Parallax Damping ---
    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = performance.now();

      // Smooth mouse parallax damping (lerp)
      targetX += (mouseX * 0.8 - targetX) * 0.04;
      targetY += (-mouseY * 0.5 - targetY) * 0.04;

      camera.position.x = targetX + Math.sin(t * 0.0004) * 0.25;
      camera.position.y = 2.2 + targetY + Math.cos(t * 0.0005) * 0.15;
      camera.lookAt(0.8, 1.2, 0);

      // Animate kinetic crystals
      crystals.forEach((c, idx) => {
        c.mesh.position.y = c.baseY + Math.sin(t * c.speed + idx) * c.amp;
        c.mesh.rotation.x += c.rx;
        c.mesh.rotation.y += c.ry;
        c.mesh.rotation.z += c.rz;
      });

      // Slowly rotate particle field
      particles.rotation.y = t * 0.00004;
      platGroup.rotation.y = Math.sin(t * 0.0002) * 0.04;

      // Pulse accent lights gently
      violetLight.intensity = 24 + Math.sin(t * 0.002) * 6;
      cyanLight.intensity = 24 + Math.cos(t * 0.002) * 6;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", onPointerMove);
      window.removeEventListener("resize", onResize);
      if (mount && renderer.domElement) {
        mount.removeChild(renderer.domElement);
      }
      scene.clear();
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="u3-hero-canvas" aria-hidden="true" />;
}
