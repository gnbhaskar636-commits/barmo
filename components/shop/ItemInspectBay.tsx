"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { Item } from "@/lib/economy/catalog";
import { makeCompanion } from "@/lib/world/companion";
import { addAura } from "@/lib/world/aura";

interface ItemInspectBayProps {
  item: Item;
  glyph: string;
}

export function ItemInspectBay({ item, glyph }: ItemInspectBayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !canvasRef.current || !containerRef.current) return;

    let destroyed = false;
    let animId = 0;
    let renderer: THREE.WebGLRenderer | null = null;
    let scene: THREE.Scene | null = null;
    let camera: THREE.PerspectiveCamera | null = null;
    let turntable: THREE.Group | null = null;
    let auraHandle: ReturnType<typeof addAura> | null = null;

    try {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      const width = container.clientWidth || 280;
      const height = container.clientHeight || 280;

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      camera.position.set(0, 0.45, 2.5);
      camera.lookAt(0, 0.05, 0);

      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
      scene.add(ambientLight);

      const hexC2 = parseInt(item.c2.replace("#", ""), 16) || 0x5ef2e0;
      const keyLight = new THREE.DirectionalLight(hexC2, 1.8);
      keyLight.position.set(2, 3, 2);
      scene.add(keyLight);

      const fillLight = new THREE.PointLight(0x8b5cf6, 1.2, 10);
      fillLight.position.set(-2, 1, -1);
      scene.add(fillLight);

      turntable = new THREE.Group();
      scene.add(turntable);

      // Build model based on kind
      if (item.kind === "hoverboard") {
        const boardGroup = new THREE.Group();
        const hexC1 = parseInt(item.c1.replace("#", ""), 16) || 0x08140c;

        // Main deck
        const deckGeo = new THREE.BoxGeometry(1.2, 0.045, 0.44);
        const deckMat = new THREE.MeshStandardMaterial({
          color: hexC1,
          metalness: 0.85,
          roughness: 0.25,
        });
        const deck = new THREE.Mesh(deckGeo, deckMat);
        boardGroup.add(deck);

        // Neon edge border
        const edgeGeo = new THREE.BoxGeometry(1.22, 0.055, 0.46);
        const edgeMat = new THREE.MeshBasicMaterial({
          color: hexC2,
          wireframe: true,
          transparent: true,
          opacity: 0.6,
        });
        const edge = new THREE.Mesh(edgeGeo, edgeMat);
        boardGroup.add(edge);

        // Underside hover repulsor ring
        const ringGeo = new THREE.RingGeometry(0.18, 0.26, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: hexC2,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8,
          blending: THREE.AdditiveBlending,
        });
        const ringF = new THREE.Mesh(ringGeo, ringMat);
        ringF.rotation.x = Math.PI / 2;
        ringF.position.set(0.35, -0.035, 0);
        boardGroup.add(ringF);

        const ringR = new THREE.Mesh(ringGeo, ringMat);
        ringR.rotation.x = Math.PI / 2;
        ringR.position.set(-0.35, -0.035, 0);
        boardGroup.add(ringR);

        // Center holographic badge
        const badgeGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.01, 16);
        const badgeMat = new THREE.MeshBasicMaterial({ color: hexC2 });
        const badge = new THREE.Mesh(badgeGeo, badgeMat);
        badge.position.y = 0.025;
        boardGroup.add(badge);

        boardGroup.rotation.z = 0.12;
        boardGroup.rotation.x = 0.25;
        turntable.add(boardGroup);
      } else if (item.kind === "pet") {
        const petGroup = makeCompanion(item.id);
        petGroup.scale.set(1.4, 1.4, 1.4);
        petGroup.position.set(0, -0.2, 0);
        turntable.add(petGroup);
      } else if (item.kind === "aura") {
        const auraGroup = new THREE.Group();
        auraGroup.position.set(0, -0.5, 0);
        turntable.add(auraGroup);
        auraHandle = addAura(auraGroup, item.id);
      }

      // Drag interaction handling
      let isDragging = false;
      let prevX = 0;
      let prevY = 0;
      let dragVelocityX = 0;

      const onPointerDown = (e: PointerEvent) => {
        isDragging = true;
        prevX = e.clientX;
        prevY = e.clientY;
        dragVelocityX = 0;
      };

      const onPointerMove = (e: PointerEvent) => {
        if (!isDragging || !turntable) return;
        const dx = e.clientX - prevX;
        const dy = e.clientY - prevY;
        prevX = e.clientX;
        prevY = e.clientY;

        turntable.rotation.y += dx * 0.015;
        turntable.rotation.x = Math.max(-0.4, Math.min(0.4, turntable.rotation.x + dy * 0.01));
        dragVelocityX = dx * 0.015;
      };

      const onPointerUp = () => {
        isDragging = false;
      };

      canvas.addEventListener("pointerdown", onPointerDown);
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);

      // Resize observer
      const onResize = () => {
        if (!container || !renderer || !camera) return;
        const w = container.clientWidth || 280;
        const h = container.clientHeight || 280;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener("resize", onResize);

      // Animation loop
      const startTime = performance.now();
      const render = (time: number) => {
        if (destroyed || !renderer || !scene || !camera || !turntable) return;
        animId = requestAnimationFrame(render);

        const elapsed = time - startTime;

        if (!isDragging) {
          turntable.rotation.y += 0.009 + dragVelocityX;
          dragVelocityX *= 0.92;
        }

        // Float effect for hoverboard/pet
        if (item.kind === "hoverboard" || item.kind === "pet") {
          turntable.position.y = Math.sin(elapsed * 0.0025) * 0.04;
        }

        if (auraHandle && typeof auraHandle.update === "function") {
          auraHandle.update(elapsed);
        }

        renderer.render(scene, camera);
      };
      animId = requestAnimationFrame(render);

      return () => {
        destroyed = true;
        cancelAnimationFrame(animId);
        window.removeEventListener("resize", onResize);
        if (canvas) {
          canvas.removeEventListener("pointerdown", onPointerDown);
        }
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);

        if (auraHandle && typeof auraHandle.dispose === "function") {
          auraHandle.dispose();
        }
        if (scene) {
          scene.traverse((obj) => {
            if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments || obj instanceof THREE.Points) {
              obj.geometry?.dispose();
              if (Array.isArray(obj.material)) {
                obj.material.forEach((m) => m.dispose());
              } else {
                obj.material?.dispose();
              }
            }
          });
        }
        renderer?.dispose();
      };
    } catch (err) {
      console.warn("[ItemInspectBay] WebGL initialization failed, falling back to 2D glyph preview", err);
      setWebglFailed(true);
    }
  }, [item]);

  if (webglFailed) {
    return (
      <div
        className="u3-holobay-preview"
        style={{
          background: `radial-gradient(circle at 40% 35%, ${item.c2}33, ${item.c1} 80%), rgba(10,14,24,0.9)`,
          borderColor:
            item.rarity === "epic"
              ? "rgba(196,92,255,0.4)"
              : item.rarity === "rare"
              ? "rgba(94,168,255,0.4)"
              : "rgba(94,242,224,0.3)",
        }}
      >
        <div className="u3-holo-ring r1" />
        <div className="u3-holo-ring r2" />
        <span className="u3-holo-glyph" style={{ color: item.c2 }}>
          {glyph}
        </span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="u3-holobay-preview"
      style={{
        position: "relative",
        background: `radial-gradient(circle at 40% 35%, ${item.c2}2b, ${item.c1} 85%), rgba(10,14,24,0.9)`,
        borderColor:
          item.rarity === "epic"
            ? "rgba(196,92,255,0.4)"
            : item.rarity === "rare"
            ? "rgba(94,168,255,0.4)"
            : "rgba(94,242,224,0.3)",
        overflow: "hidden",
        cursor: "grab",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div className="u3-holo-ring r1" style={{ pointerEvents: "none" }} />
      <div className="u3-holo-ring r2" style={{ pointerEvents: "none" }} />
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          outline: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 8,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 10,
          letterSpacing: "0.5px",
          color: "rgba(255,255,255,0.4)",
          pointerEvents: "none",
          textTransform: "uppercase",
        }}
      >
        3D Holographic Bay · Drag to Rotate
      </div>
    </div>
  );
}
