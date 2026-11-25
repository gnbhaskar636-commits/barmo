/**
 * tests/e2e/harness.test.ts
 *
 * Self-verification test suite for Barmo Lounge E2E test harness:
 * - DOM Shim (window, document, events, touch/pointer, matchMedia responsive queries)
 * - WebGL Mock (OpenGL constants, Three.js WebGLRenderer instantiation, rendering, context loss)
 * - Assertion library (expect, toBeCloseTo, deep equality, error throwing)
 */

import { installDOMShim, cleanupDOMShim, setViewport, getViewport } from "./harness/domShim";
import { installWebGLMock, cleanupWebGLMock } from "./harness/webglMock";
import { expect, assert } from "./harness/assert";
import * as THREE from "three";

export async function runHarnessTests(): Promise<{ passed: number; failed: number; total: number; duration: number }> {
  const start = Date.now();
  let passed = 0;
  let failed = 0;

  function record(name: string, fn: () => void | Promise<void>) {
    try {
      fn();
      passed++;
      console.log(`    ✔ [PASS] ${name}`);
    } catch (err: any) {
      failed++;
      console.error(`    ✖ [FAIL] ${name}:`, err?.message || err);
    }
  }

  async function recordAsync(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      passed++;
      console.log(`    ✔ [PASS] ${name}`);
    } catch (err: any) {
      failed++;
      console.error(`    ✖ [FAIL] ${name}:`, err?.message || err);
    }
  }

  installDOMShim({ width: 1280, height: 800 });
  installWebGLMock();

  try {
    // 1. Assertions tests
    record("assert: condition truthiness and failure", () => {
      assert(true, "truthy should pass");
      expect(() => assert(false, "falsy must throw")).toThrow("falsy must throw");
    });

    record("expect.toBe: strict equality and inversion", () => {
      expect(42).toBe(42);
      expect("barmo").toBe("barmo");
      expect("hello").not.toBe("world");
    });

    record("expect.toBeCloseTo: numeric precision comparisons", () => {
      expect(3.14159).toBeCloseTo(3.14, 2);
      expect(0.1 + 0.2).toBeCloseTo(0.3, 5);
      expect(1.5).not.toBeCloseTo(2.0, 1);
    });

    record("expect.toEqual: deep equality for objects and arrays", () => {
      expect({ a: 1, b: [2, 3] }).toEqual({ a: 1, b: [2, 3] });
      expect([1, { x: "y" }]).toEqual([1, { x: "y" }]);
      expect({ a: 1 }).not.toEqual({ a: 2 });
    });

    record("expect.toBeDefined / toBeUndefined / toBeNull", () => {
      expect("defined").toBeDefined();
      expect(undefined).toBeUndefined();
      expect(null).toBeNull();
      expect(null).not.toBeUndefined();
    });

    record("expect.toThrow: exceptions and error message matching", () => {
      expect(() => {
        throw new Error("Invalid matrix coordinate");
      }).toThrow("Invalid matrix coordinate");
      expect(() => {
        throw new TypeError("Type mismatch");
      }).toThrow(TypeError);
      expect(() => {}).not.toThrow();
    });

    // 2. DOM Shim tests
    record("domShim: window and document global availability", () => {
      expect(typeof window).toBe("object");
      expect(typeof document).toBe("object");
      expect(window.innerWidth).toBe(1280);
      expect(window.innerHeight).toBe(800);
    });

    record("domShim: HTMLElement creation and hierarchy", () => {
      const container = document.createElement("div");
      container.className = "b4-shell test-container";
      const child = document.createElement("span");
      child.id = "status-badge";
      container.appendChild(child);

      expect(container.classList.contains("b4-shell")).toBe(true);
      expect(container.querySelector("#status-badge")).toBe(child);
      expect(child.parentElement).toBe(container);
    });

    record("domShim: Event dispatching and propagation", () => {
      let clicked = false;
      let targetTag = "";
      const btn = document.createElement("button");
      btn.addEventListener("click", (e: any) => {
        clicked = true;
        targetTag = e.target.tagName;
      });

      const evt = new (globalThis as any).Event("click");
      btn.dispatchEvent(evt);

      expect(clicked).toBe(true);
      expect(targetTag).toBe("BUTTON");
    });

    record("domShim: PointerEvent and TouchEvent instantiation", () => {
      const pEvent = new (globalThis as any).PointerEvent("pointerdown", {
        clientX: 120,
        clientY: 340,
        pointerId: 4,
        pointerType: "touch",
      });
      expect(pEvent.clientX).toBe(120);
      expect(pEvent.clientY).toBe(340);
      expect(pEvent.pointerId).toBe(4);
      expect(pEvent.pointerType).toBe("touch");

      const tEvent = new (globalThis as any).TouchEvent("touchstart", {
        touches: [{ identifier: 1, clientX: 50, clientY: 75 }],
      });
      expect(tEvent.touches.length).toBe(1);
      expect(tEvent.touches[0].clientX).toBe(50);
    });

    record("domShim: matchMedia responsive evaluation at 1280px (Desktop)", () => {
      setViewport(1280, 800);
      const isMobile = window.matchMedia("(max-width: 960px)");
      const isDesktop = window.matchMedia("(min-width: 961px)");

      expect(isMobile.matches).toBe(false);
      expect(isDesktop.matches).toBe(true);
    });

    record("domShim: matchMedia reactive update on setViewport to 390px (Mobile)", () => {
      setViewport(1280, 800);
      const mql = window.matchMedia("(max-width: 960px)");
      expect(mql.matches).toBe(false);

      let notified = false;
      mql.addEventListener("change", (e: any) => {
        if (e.matches) notified = true;
      });

      setViewport(390, 844);
      expect(mql.matches).toBe(true);
      expect(notified).toBe(true);

      // Restore desktop viewport
      setViewport(1280, 800);
      expect(mql.matches).toBe(false);
    });

    record("domShim: pointer lock request and exit", () => {
      const canvas = document.createElement("canvas");
      let lockChanged = false;
      document.addEventListener("pointerlockchange", () => {
        lockChanged = true;
      });

      (canvas as any).requestPointerLock();
      expect(document.pointerLockElement).toBe(canvas);
      expect(lockChanged).toBe(true);

      lockChanged = false;
      (document as any).exitPointerLock();
      expect(document.pointerLockElement).toBeNull();
      expect(lockChanged).toBe(true);
    });

    // 3. WebGL Mock tests
    record("webglMock: canvas getContext attaches mock context", () => {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2") as any;
      expect(gl).toBeDefined();
      expect(gl.isWebGL2).toBe(true);
      expect(gl.TRIANGLES).toBe(0x0004);
      expect(gl.COLOR_BUFFER_BIT).toBe(0x4000);
    });

    await recordAsync("webglMock: Three.js WebGLRenderer initialization", async () => {
      const canvas = document.createElement("canvas");
      const renderer = new THREE.WebGLRenderer({ canvas });
      expect(renderer).toBeDefined();
      expect(renderer.domElement).toBe(canvas);
      renderer.dispose();
    });

    await recordAsync("webglMock: Three.js scene rendering and draw call telemetry", async () => {
      const canvas = document.createElement("canvas");
      const renderer = new THREE.WebGLRenderer({ canvas });
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 100);
      const geom = new THREE.BoxGeometry(1, 1, 1);
      const mat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
      const mesh = new THREE.Mesh(geom, mat);
      scene.add(mesh);

      const gl = canvas.getContext("webgl2") as any;
      gl.resetStats();
      renderer.render(scene, camera);

      expect(gl.drawCalls).toBeGreaterThanOrEqual(1);
      expect(gl.clearCalls).toBeGreaterThanOrEqual(1);
      renderer.dispose();
    });

    record("webglMock: simulated WebGL context loss and restoral lifecycle", () => {
      const canvas = document.createElement("canvas");
      let contextLostFired = false;
      let contextRestoredFired = false;

      canvas.addEventListener("webglcontextlost", (e: any) => {
        contextLostFired = true;
        e.preventDefault();
      });
      canvas.addEventListener("webglcontextrestored", () => {
        contextRestoredFired = true;
      });

      const gl = canvas.getContext("webgl2") as any;
      expect(gl.isContextLost()).toBe(false);

      gl.simulateContextLoss();
      expect(gl.isContextLost()).toBe(true);
      expect(contextLostFired).toBe(true);

      gl.simulateContextRestored();
      expect(gl.isContextLost()).toBe(false);
      expect(contextRestoredFired).toBe(true);
    });
  } finally {
    cleanupWebGLMock();
    cleanupDOMShim();
  }

  const duration = Date.now() - start;
  return { passed, failed, total: passed + failed, duration };
}
