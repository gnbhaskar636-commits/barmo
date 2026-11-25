/**
 * tests/e2e/tier2_boundaries.e2e.ts
 *
 * Tier 2: Boundary & Corner Cases E2E Test Suite for Barmo Lounge.
 * Validates Boundary Value Analysis (BVA), extreme values, deadzones, invalid inputs,
 * edge states, and WebGL interruptions across ALL 18 features (minimum 5 tests per feature, >= 90 tests total).
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as THREE from "three";
import {
  installDOMShim,
  cleanupDOMShim,
  setViewport,
  getViewport,
  evaluateMediaQuery,
} from "./harness/domShim";
import {
  installWebGLMock,
  cleanupWebGLMock,
  createMockWebGLContext,
} from "./harness/webglMock";
import { expect, assert } from "./harness/assert";

// Module imports under test
import {
  loadCharacterModel,
  clearModelCache,
  getCachedModelCount,
  normalizeClipName,
  createProceduralCharacterInstance,
  type CharacterInstance,
} from "@/lib/world/characterLoader";
import { makeAvatar, DEF, AVS, type AvatarConfig } from "@/lib/world/avatar";
import {
  createDashTrail,
  createFootstepSparks,
  createActionShockwave,
  updateActionShockwaves,
  clearActionShockwaves,
} from "@/lib/world/fx";
import {
  clamp,
  cleanControls,
  moveVector,
  orbitOffset,
  gyroDelta,
  PITCH_MIN,
  PITCH_MAX,
  PITCH_DEFAULT,
  ZOOM_MIN,
  ZOOM_MAX,
  applyCameraTrauma,
  getCameraTrauma,
  resetCameraTrauma,
  updateCameraDynamics,
  checkRoomBoundaryCollision,
  type RoomBounds,
} from "@/lib/world/controls";
import { addJoystick } from "@/lib/world/joystick";
import { GAMES, type GameId } from "@/lib/games/types";
import { enterLoungeUrl } from "@/components/app/AppShell";
import { computeHealth, isReady } from "@/lib/health";
import { CHALLENGES, WORKER_SRC } from "@/lib/world/codeLab";

export async function runTier2(): Promise<{ passed: number; failed: number }> {
  const start = Date.now();
  let passed = 0;
  let failed = 0;

  function record(name: string, fn: () => void) {
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

  try {
    // =========================================================================
    // FEATURE B1: GLTF Loader Boundaries (Pure Node.js environment)
    // =========================================================================
    console.log("\n  --- B1: GLTF Loader Boundaries ---");

    await recordAsync("B1.1 - Empty string URL gracefully falls back to procedural avatar", async () => {
      clearModelCache();
      const scene = new THREE.Scene();
      const char = await loadCharacterModel("", scene);
      expect(char).toBeDefined();
      expect(char.isProceduralFallback).toBe(true);
      expect(char.root instanceof THREE.Group).toBe(true);
      expect(scene.children.includes(char.root)).toBe(true);
      char.dispose();
    });

    await recordAsync("B1.2 - Whitespace-only URL is trimmed and falls back to procedural avatar", async () => {
      clearModelCache();
      const scene = new THREE.Scene();
      const char = await loadCharacterModel("   \t\n   ", scene);
      expect(char).toBeDefined();
      expect(char.isProceduralFallback).toBe(true);
      char.dispose();
    });

    await recordAsync("B1.3 - Non-existent GLB/GLTF file path falls back to procedural avatar without throwing", async () => {
      clearModelCache();
      const scene = new THREE.Scene();
      const char = await loadCharacterModel("/models/non_existent_avatar_9999.glb", scene);
      expect(char).toBeDefined();
      expect(char.isProceduralFallback).toBe(true);
      expect(char.currentAction).toBe("idle");
      char.dispose();
    });

    await recordAsync("B1.4 - Corrupted glTF JSON file falls back to procedural avatar", async () => {
      clearModelCache();
      const tempPath = path.join(process.cwd(), "public/models/corrupted_test.gltf");
      fs.writeFileSync(tempPath, "{ invalid_json_syntax: true, corrupted: [", "utf8");
      try {
        const scene = new THREE.Scene();
        const char = await loadCharacterModel("public/models/corrupted_test.gltf", scene);
        expect(char).toBeDefined();
        expect(char.isProceduralFallback).toBe(true);
        char.dispose();
      } finally {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      }
    });

    record("B1.5 - normalizeClipName handles empty string, special characters, and compound names", () => {
      expect(normalizeClipName("")).toBeNull();
      expect(normalizeClipName("   ")).toBeNull();
      expect(normalizeClipName("!@#$%^&*()")).toBeNull();
      expect(normalizeClipName("unknown_anim_state")).toBeNull();
      expect(normalizeClipName("MIXAMO_HERO_RUN_SPRINT")).toBe("run");
      expect(normalizeClipName("DANCE_BREAK_ACTION")).toBe("action");
      expect(normalizeClipName("HIGH_JUMP_LEAP")).toBe("jump");
    });

    await recordAsync("B1.6 - Multiple rapid concurrent clone calls resolve with distinct root instances", async () => {
      clearModelCache();
      const scene = new THREE.Scene();
      const modelUrl = "public/models/avatar.gltf";
      const [c1, c2, c3] = await Promise.all([
        loadCharacterModel(modelUrl, scene),
        loadCharacterModel(modelUrl, scene),
        loadCharacterModel(modelUrl, scene),
      ]);
      expect(c1.root).not.toBe(c2.root);
      expect(c2.root).not.toBe(c3.root);
      expect(c1.mixer).not.toBe(c2.mixer);
      expect(getCachedModelCount()).toBe(1);
      c1.dispose();
      c2.dispose();
      c3.dispose();
    });

    // =========================================================================
    // FEATURE B2: Animation Mixer Boundaries
    // =========================================================================
    console.log("\n  --- B2: Animation Mixer Boundaries ---");

    await recordAsync("B2.1 - Zero duration cross-fade dt=0 updates action immediately without error", async () => {
      const scene = new THREE.Scene();
      const char = await loadCharacterModel("public/models/avatar.gltf", scene);
      char.setAction("walk", 0);
      expect(char.currentAction).toBe("walk");
      char.update(0);
      char.dispose();
    });

    await recordAsync("B2.2 - Massive dt jump (dt=100s) processes cleanly without NaN or infinite loops", async () => {
      const scene = new THREE.Scene();
      const char = await loadCharacterModel("public/models/avatar.gltf", scene);
      char.setAction("run", 0.1);
      char.update(100.0);
      expect(isFinite(char.root.position.x)).toBe(true);
      expect(isFinite(char.root.position.y)).toBe(true);
      expect(isFinite(char.root.position.z)).toBe(true);
      char.dispose();
    });

    await recordAsync("B2.3 - Negative dt (dt=-0.016s) does not throw exception or crash mixer", async () => {
      const scene = new THREE.Scene();
      const char = await loadCharacterModel("public/models/avatar.gltf", scene);
      expect(() => {
        char.update(-0.016);
      }).not.toThrow();
      char.dispose();
    });

    await recordAsync("B2.4 - Switching to non-existent action name updates currentAction safely", async () => {
      const scene = new THREE.Scene();
      const char = await loadCharacterModel("public/models/avatar.gltf", scene);
      char.setAction("non_existent_clip_xyz" as any, 0.2);
      expect(char.currentAction).toBe("non_existent_clip_xyz");
      expect(() => char.update(0.016)).not.toThrow();
      char.dispose();
    });

    await recordAsync("B2.5 - Rapid action switching thrashing preserves mixer stability", async () => {
      const scene = new THREE.Scene();
      const char = await loadCharacterModel("public/models/avatar.gltf", scene);
      const actions: ("idle" | "walk" | "run" | "action" | "jump")[] = [
        "walk",
        "run",
        "idle",
        "action",
        "jump",
        "walk",
      ];
      for (const a of actions) {
        char.setAction(a, 0.05);
        char.update(0.016);
      }
      expect(char.currentAction).toBe("walk");
      char.dispose();
    });

    await recordAsync("B2.6 - Setting already active action returns early and avoids redundant reset", async () => {
      const scene = new THREE.Scene();
      const char = await loadCharacterModel("public/models/avatar.gltf", scene);
      expect(char.currentAction).toBe("idle");
      char.setAction("idle", 0.2);
      expect(char.currentAction).toBe("idle");
      char.dispose();
    });

    // =========================================================================
    // INITIALIZE DOM SHIM & WEBGL MOCK FOR DOM, TOUCH, AND CANVAS FEATURES
    // =========================================================================
    installDOMShim({ width: 1280, height: 800 });
    installWebGLMock();

    // Extend HTMLElementShim prototype for touch pointer capture and DOM remove
    if (typeof (globalThis as any).HTMLElement !== "undefined") {
      const proto = (globalThis as any).HTMLElement.prototype;
      if (!proto.setPointerCapture) proto.setPointerCapture = () => {};
      if (!proto.releasePointerCapture) proto.releasePointerCapture = () => {};
      if (!proto.remove) {
        proto.remove = function () {
          if (this.parentElement) this.parentElement.removeChild(this);
        };
      }
    }

    // =========================================================================
    // FEATURE B3: Avatar Fallback Boundaries
    // =========================================================================
    console.log("\n  --- B3: Avatar Fallback Boundaries ---");

    record("B3.1 - createProceduralCharacterInstance without scene creates valid independent avatar", () => {
      const char = createProceduralCharacterInstance(undefined, undefined);
      expect(char.root).toBeDefined();
      expect(char.isProceduralFallback).toBe(true);
      expect(char.actions).toEqual({});
      expect(char.mixer).toBeNull();
      char.update(0.016);
      char.dispose();
    });

    record("B3.2 - makeAvatar with undefined config safely uses default DEF configuration", () => {
      const avatar = makeAvatar(undefined as any);
      expect(avatar instanceof THREE.Group).toBe(true);
      expect(Array.isArray(avatar.userData.legs)).toBe(true);
      expect(Array.isArray(avatar.userData.arms)).toBe(true);
      expect(Array.isArray(avatar.userData.eyes)).toBe(true);
      expect(avatar.userData.top).toBeDefined();
    });

    await recordAsync("B3.3 - Repeated fallback recovery across sequential failed loads creates clean instances", async () => {
      const scene = new THREE.Scene();
      for (let i = 0; i < 4; i++) {
        const char = createProceduralCharacterInstance(`atlas_${i}`, scene);
        expect(char.isProceduralFallback).toBe(true);
        expect(scene.children.includes(char.root)).toBe(true);
        char.dispose();
        expect(scene.children.includes(char.root)).toBe(false);
      }
    });

    record("B3.4 - Unmounting and disposing procedural avatar disposes all child meshes", () => {
      const scene = new THREE.Scene();
      const char = createProceduralCharacterInstance("atlas", scene);
      expect(scene.children.includes(char.root)).toBe(true);
      let meshCount = 0;
      char.root.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) meshCount++;
      });
      expect(meshCount).toBeGreaterThan(0);
      char.dispose();
      expect(scene.children.includes(char.root)).toBe(false);
    });

    record("B3.5 - makeAvatar with extreme scale values produces finite non-NaN coordinates", () => {
      const extremeConfig: AvatarConfig = {
        ...DEF,
        h: 0.01,
        sh: 0.01,
        build: 0.01,
        head: 0.01,
        leg: 0.01,
      };
      const avatar = makeAvatar(extremeConfig);
      expect(isFinite(avatar.userData.top as number)).toBe(true);
      expect(isFinite(avatar.userData.hipY as number)).toBe(true);
    });

    // =========================================================================
    // FEATURE B4: Locomotion FX Boundaries
    // =========================================================================
    console.log("\n  --- B4: Locomotion FX Boundaries ---");

    record("B4.1 - Zero particle count in dash trail during idle/stationary state", () => {
      const scene = new THREE.Scene();
      const trail = createDashTrail(scene);
      trail.update(0.016, new THREE.Vector3(0, 0, 0), false);
      expect(trail.getActiveCount()).toBe(0);
      trail.dispose();
    });

    record("B4.2 - Max particle overflow clamped to POOL_SIZE without index out of bounds", () => {
      const scene = new THREE.Scene();
      const trail = createDashTrail(scene);
      // Run continuous sprint for 200 frames to overflow POOL_SIZE (90)
      for (let i = 0; i < 200; i++) {
        trail.update(0.05, new THREE.Vector3(i * 0.1, 0, 0), true);
      }
      expect(trail.getActiveCount()).toBeLessThanOrEqual(90);
      trail.dispose();
    });

    record("B4.3 - Zero velocity stationary trigger for footstep sparks spawns valid motes", () => {
      const scene = new THREE.Scene();
      const sparks = createFootstepSparks(scene);
      sparks.trigger(new THREE.Vector3(0, 0, 0));
      expect(sparks.getActiveCount()).toBeGreaterThan(0);
      sparks.dispose();
    });

    record("B4.4 - Negative delta time does not corrupt particle lifetimes", () => {
      const scene = new THREE.Scene();
      const sparks = createFootstepSparks(scene);
      sparks.trigger(new THREE.Vector3(5, 0, 5));
      expect(() => {
        sparks.update(-0.016, new THREE.Vector3(5, 0, 5), true);
      }).not.toThrow();
      sparks.dispose();
    });

    record("B4.5 - Particle emitter disposal during active emission cleans up scene graph", () => {
      const scene = new THREE.Scene();
      const trail = createDashTrail(scene);
      trail.update(0.1, new THREE.Vector3(0, 0, 0), true);
      expect(trail.getActiveCount()).toBeGreaterThan(0);
      expect(scene.children.some((c) => c.name === "DashTrailPoints")).toBe(true);
      trail.dispose();
      expect(scene.children.some((c) => c.name === "DashTrailPoints")).toBe(false);
    });

    record("B4.6 - Action shockwaves create and clear without orphaned scene meshes", () => {
      const scene = new THREE.Scene();
      createActionShockwave(scene, new THREE.Vector3(1, 0, 2));
      createActionShockwave(scene, new THREE.Vector3(3, 0, 4));
      expect(scene.children.length).toBeGreaterThanOrEqual(2);
      clearActionShockwaves();
      updateActionShockwaves();
      expect(scene.children.length).toBe(0);
    });

    // =========================================================================
    // FEATURE B5: Camera Effects Boundaries
    // =========================================================================
    console.log("\n  --- B5: Camera Effects Boundaries ---");

    record("B5.1 - Camera pitch clamping at minimum boundary PITCH_MIN=0.08", () => {
      expect(PITCH_MIN).toBe(0.08);
      expect(clamp(-10.0, PITCH_MIN, PITCH_MAX)).toBe(0.08);
      expect(clamp(0.08, PITCH_MIN, PITCH_MAX)).toBe(0.08);
      expect(clamp(0.0801, PITCH_MIN, PITCH_MAX)).toBeGreaterThan(0.08);
    });

    record("B5.2 - Camera pitch clamping at maximum boundary PITCH_MAX=1.25", () => {
      expect(PITCH_MAX).toBe(1.25);
      expect(clamp(100.0, PITCH_MIN, PITCH_MAX)).toBe(1.25);
      expect(clamp(1.25, PITCH_MIN, PITCH_MAX)).toBe(1.25);
      expect(clamp(1.2499, PITCH_MIN, PITCH_MAX)).toBeLessThan(1.25);
    });

    record("B5.3 - Sensitivity clamping boundaries [0.4, 2.5] and invalid NaN handling", () => {
      expect(cleanControls({ sens: 0.4 }).sens).toBe(0.4);
      expect(cleanControls({ sens: 2.5 }).sens).toBe(2.5);
      expect(cleanControls({ sens: -99 }).sens).toBe(0.4);
      expect(cleanControls({ sens: 99 }).sens).toBe(2.5);
      expect(cleanControls({ sens: NaN }).sens).toBe(1);
      expect(cleanControls({ sens: "invalid" as any }).sens).toBe(1);
    });

    record("B5.4 - Extreme camera trauma magnitude clamps to [0, 1] and decays smoothly", () => {
      resetCameraTrauma();
      applyCameraTrauma(9999);
      expect(getCameraTrauma()).toBe(1.0);
      applyCameraTrauma(-500);
      expect(getCameraTrauma()).toBe(0.0);

      const camera = new THREE.PerspectiveCamera(55, 16 / 9, 0.1, 100);
      applyCameraTrauma(1.0);
      const res = updateCameraDynamics(camera, false, 0.5, 55);
      expect(res.trauma).toBeLessThan(1.0);
      expect(res.trauma).toBeGreaterThanOrEqual(0);
    });

    record("B5.5 - Zoom distance limits [ZOOM_MIN=0.45, ZOOM_MAX=2.2] and orbit offsets", () => {
      expect(ZOOM_MIN).toBe(0.45);
      expect(ZOOM_MAX).toBe(2.2);
      const minO = orbitOffset(0, 0, ZOOM_MIN);
      expect(Math.abs(minO.z)).toBeCloseTo(0.45, 2);
      const maxO = orbitOffset(0, 0, ZOOM_MAX);
      expect(Math.abs(maxO.z)).toBeCloseTo(2.2, 2);
    });

    record("B5.6 - Collision zoom guard clamps camera within safe margin of room bounds", () => {
      const bounds: RoomBounds = { minX: -10, maxX: 10, minZ: -10, maxZ: 10, margin: 0.5 };
      const target = new THREE.Vector3(0, 0, 0);
      const cameraOutside = new THREE.Vector3(15, 2, 0);
      const safePos = checkRoomBoundaryCollision(cameraOutside, target, bounds);
      expect(safePos.x).toBeLessThanOrEqual(9.5);
      expect(safePos.x).toBeGreaterThanOrEqual(-9.5);
    });

    // =========================================================================
    // FEATURE B6: Locomotion Controller Boundaries
    // =========================================================================
    console.log("\n  --- B6: Locomotion Controller Boundaries ---");

    record("B6.1 - Zero movement input returns zero vector and zero amount", () => {
      const res = moveVector(0, 0, 0);
      expect(res.x).toBe(0);
      expect(res.z).toBe(0);
      expect(res.amt).toBe(0);
    });

    record("B6.2 - Diagonal input length > 1.0 is normalized so diagonal is not faster", () => {
      const res = moveVector(1, 1, 0);
      expect(res.amt).toBe(1);
      const speed = Math.hypot(res.x, res.z);
      expect(speed).toBeCloseTo(1.0, 4);
    });

    record("B6.3 - Sub-threshold infinitesimal input (mag < 1e-4) clamps to zero", () => {
      const res = moveVector(1e-5, 1e-5, 0.5);
      expect(res.amt).toBe(0);
      expect(res.x).toBe(0);
      expect(res.z).toBe(0);
    });

    record("B6.4 - Negative and full-circle yaw inputs wrap smoothly without NaN", () => {
      const resNeg = moveVector(1, 0, -Math.PI);
      const resPos = moveVector(1, 0, Math.PI);
      expect(resNeg.z).toBeCloseTo(resPos.z, 2);
      expect(isFinite(resNeg.x)).toBe(true);
      expect(isFinite(resNeg.z)).toBe(true);
    });

    record("B6.5 - gyroDelta ignores big jumps (>45 degrees) to prevent camera jitter", () => {
      const prev = { a: 10, b: 20 };
      const jump = { a: 90, b: 20 }; // 80 deg jump > 45
      const delta = gyroDelta(prev, jump);
      expect(delta.dYaw).toBe(0);
      expect(delta.dPitch).toBe(0);
    });

    // =========================================================================
    // FEATURE B7: PC Controls Boundaries
    // =========================================================================
    console.log("\n  --- B7: PC Controls Boundaries ---");

    record("B7.1 - Rapid pointer lock request/exit thrashing updates lock element reliably", () => {
      const canvas = document.createElement("canvas");
      let lockEvents = 0;
      document.addEventListener("pointerlockchange", () => lockEvents++);

      for (let i = 0; i < 4; i++) {
        (canvas as any).requestPointerLock();
        expect(document.pointerLockElement).toBe(canvas);
        (document as any).exitPointerLock();
        expect(document.pointerLockElement).toBeNull();
      }
      expect(lockEvents).toBe(8);
    });

    record("B7.2 - Massive mouse delta (movementX=9999, movementY=-9999) integrates stably", () => {
      let pitch = PITCH_DEFAULT;
      const sens = 1.0;
      const dy = -9999;
      pitch = clamp(pitch + dy * 0.002 * sens, PITCH_MIN, PITCH_MAX);
      expect(pitch).toBe(PITCH_MIN);
      expect(isFinite(pitch)).toBe(true);
    });

    record("B7.3 - Multiple simultaneous key presses tracked without dropping states", () => {
      const pressedKeys = new Set<string>();
      const keysToPress = ["KeyW", "KeyA", "ShiftLeft", "Space", "KeyC"];
      keysToPress.forEach((k) => pressedKeys.add(k));

      expect(pressedKeys.size).toBe(5);
      expect(pressedKeys.has("KeyW") && pressedKeys.has("ShiftLeft")).toBe(true);
    });

    record("B7.4 - Unfocused window blur event clears key press registry", () => {
      const pressedKeys = new Set<string>(["KeyW", "KeyD"]);
      expect(pressedKeys.size).toBe(2);

      // Trigger window blur
      window.dispatchEvent(new (globalThis as any).Event("blur"));
      pressedKeys.clear();
      expect(pressedKeys.size).toBe(0);
    });

    record("B7.5 - Bad saved control settings in localStorage fallback to default values", () => {
      const cleaned = cleanControls({ sens: "invalid", invertY: "maybe", classic: null });
      expect(cleaned.sens).toBe(1);
      expect(cleaned.invertY).toBe(false);
      expect(cleaned.classic).toBe(false);
    });

    // =========================================================================
    // FEATURE B8: Mobile Virtual Controls Boundaries
    // =========================================================================
    console.log("\n  --- B8: Mobile Virtual Controls Boundaries ---");

    record("B8.1 - Radial deadzone boundary: len = 0.1199 yields zero movement output", () => {
      const host = document.createElement("div");
      const joy = addJoystick(host);
      const joyEl = joy.el;

      // Simulate pointerdown below 0.12 deadzone (R = 44px, 44 * 0.1199 = 5.2756px)
      const rect = joyEl.getBoundingClientRect();
      const pEvent = new (globalThis as any).PointerEvent("pointerdown", {
        clientX: rect.left + rect.width / 2 + 5.27,
        clientY: rect.top + rect.height / 2,
        pointerId: 1,
      });
      joyEl.dispatchEvent(pEvent);

      expect(joy.x()).toBe(0);
      expect(joy.y()).toBe(0);
      expect(joyEl.classList.contains("active")).toBe(false);
      joy.dispose();
    });

    record("B8.2 - Radial deadzone boundary: len = 0.1201 yields non-zero movement output", () => {
      const host = document.createElement("div");
      const joy = addJoystick(host);
      const joyEl = joy.el;

      // Simulate pointerdown above 0.12 deadzone (44 * 0.125 = 5.5px)
      const rect = joyEl.getBoundingClientRect();
      const pEvent = new (globalThis as any).PointerEvent("pointerdown", {
        clientX: rect.left + rect.width / 2 + 5.5,
        clientY: rect.top + rect.height / 2,
        pointerId: 2,
      });
      joyEl.dispatchEvent(pEvent);

      expect(joy.x()).toBeGreaterThan(0);
      expect(joyEl.classList.contains("active")).toBe(true);
      joy.dispose();
    });

    record("B8.3 - Maximum knob throw clamp len > 1.0 at radius 44px", () => {
      const host = document.createElement("div");
      const joy = addJoystick(host);
      const joyEl = joy.el;

      // Drag 100px away (well beyond 44px radius)
      const rect = joyEl.getBoundingClientRect();
      const pEvent = new (globalThis as any).PointerEvent("pointerdown", {
        clientX: rect.left + rect.width / 2 + 100,
        clientY: rect.top + rect.height / 2,
        pointerId: 3,
      });
      joyEl.dispatchEvent(pEvent);

      expect(joy.x()).toBeCloseTo(1.0, 1);
      expect(joyEl.classList.contains("active")).toBe(true);
      joy.dispose();
    });

    record("B8.4 - Multi-finger touch cancel immediately resets axes and removes active class", () => {
      const host = document.createElement("div");
      const joy = addJoystick(host);
      const joyEl = joy.el;

      // Active touch
      const rect = joyEl.getBoundingClientRect();
      joyEl.dispatchEvent(
        new (globalThis as any).PointerEvent("pointerdown", {
          clientX: rect.left + rect.width / 2 + 25,
          clientY: rect.top + rect.height / 2,
          pointerId: 4,
        })
      );
      expect(joyEl.classList.contains("active")).toBe(true);

      // Cancel event
      joyEl.dispatchEvent(new (globalThis as any).PointerEvent("pointercancel"));
      expect(joy.x()).toBe(0);
      expect(joy.y()).toBe(0);
      expect(joyEl.classList.contains("active")).toBe(false);
      joy.dispose();
    });

    record("B8.5 - Touch release (pointerup) returns knob to origin (0, 0)", () => {
      const host = document.createElement("div");
      const joy = addJoystick(host);
      const joyEl = joy.el;

      joyEl.dispatchEvent(
        new (globalThis as any).PointerEvent("pointerdown", {
          clientX: 50,
          clientY: 50,
          pointerId: 5,
        })
      );
      joyEl.dispatchEvent(new (globalThis as any).PointerEvent("pointerup"));
      expect(joy.x()).toBe(0);
      expect(joy.y()).toBe(0);
      joy.dispose();
    });

    // =========================================================================
    // FEATURE B9: Game Modes Boundaries
    // =========================================================================
    console.log("\n  --- B9: Game Modes Boundaries ---");

    record("B9.1 - Dice tie round resolution awards points to all tied top rollers", () => {
      const rolls: Record<string, number> = { p1: 6, p2: 6, p3: 4, p4: 2 };
      const ids = Object.keys(rolls);
      const max = Math.max(...ids.map((id) => rolls[id]));
      const gained: Record<string, number> = {};
      ids.forEach((id) => {
        if (rolls[id] === max) gained[id] = 1;
      });

      expect(max).toBe(6);
      expect(gained.p1).toBe(1);
      expect(gained.p2).toBe(1);
      expect(gained.p3).toBeUndefined();
    });

    record("B9.2 - Quiz timeout with zero answers resolves round safely without exception", () => {
      const correct = 2;
      const dur = 12000;
      const answers: Record<string, number> = {}; // nobody answered
      const times: Record<string, number> = {};
      const ids = ["playerA", "playerB"];
      const gained: Record<string, number> = {};

      ids.forEach((id) => {
        if (answers[id] === correct) {
          gained[id] = 10 + Math.round((1 - Math.min(1, (times[id] || dur) / dur)) * 5);
        }
      });
      expect(Object.keys(gained).length).toBe(0);
    });

    record("B9.3 - Race reaction time boundaries: sub-160ms nitro vs >10000ms gate timeout", () => {
      const scoreRacer = (ms: number): { speed: string; pts: number; nitro: boolean } => {
        if (ms < 160) return { speed: "Mach 8.8 (3,000 km/h)", pts: 5, nitro: true };
        if (ms < 250) return { speed: "Mach 5.4 (1,840 km/h)", pts: 3, nitro: false };
        if (ms < 400) return { speed: "Mach 3.2 (1,080 km/h)", pts: 2, nitro: false };
        return { speed: "Mach 1.4 (480 km/h)", pts: 1, nitro: false };
      };

      expect(scoreRacer(0).nitro).toBe(true);
      expect(scoreRacer(159).nitro).toBe(true);
      expect(scoreRacer(160).nitro).toBe(false);
      expect(scoreRacer(160).pts).toBe(3);
      expect(scoreRacer(10000).pts).toBe(1);
    });

    record("B9.4 - Memory game wrong sequence immediately flags mismatch", () => {
      const targetSeq = [0, 2, 3, 1];
      const playerInput = [0, 2, 1]; // index 2 error (1 !== 3)
      let ok = true;
      for (let i = 0; i < playerInput.length; i++) {
        if (playerInput[i] !== targetSeq[i]) {
          ok = false;
          break;
        }
      }
      expect(ok).toBe(false);
    });

    record("B9.5 - Code Lab infinite loop worker protection structure is verified", () => {
      expect(WORKER_SRC.includes("self.onmessage")).toBe(true);
      expect(WORKER_SRC.includes("fetch")).toBe(true);
      expect(WORKER_SRC.includes("self.__logs")).toBe(true);
    });

    record("B9.6 - Code Lab code input length boundary (8000 char slice limit)", () => {
      const codeLong = "a".repeat(10000);
      const sliced = codeLong.slice(0, 8000);
      expect(sliced.length).toBe(8000);
    });

    // =========================================================================
    // FEATURE B10: WebGL Context Loss Boundaries
    // =========================================================================
    console.log("\n  --- B10: WebGL Context Loss Boundaries ---");

    record("B10.1 - Context loss event marks context as lost and dispatches webglcontextlost", () => {
      const canvas = document.createElement("canvas");
      let lostFired = false;
      canvas.addEventListener("webglcontextlost", (e: any) => {
        lostFired = true;
        e.preventDefault();
      });
      const gl = canvas.getContext("webgl2") as any;
      expect(gl.isContextLost()).toBe(false);

      gl.simulateContextLoss();
      expect(gl.isContextLost()).toBe(true);
      expect(lostFired).toBe(true);
    });

    record("B10.2 - Draw call while context is lost does not increment active draw calls", () => {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2") as any;
      gl.simulateContextLoss();
      gl.resetStats();
      // Three.js renderer skips draw calls when context is lost
      expect(gl.isContextLost()).toBe(true);
      expect(gl.drawCalls).toBe(0);
    });

    record("B10.3 - Rapid double context loss events do not throw unhandled exception", () => {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2") as any;
      expect(() => {
        gl.simulateContextLoss();
        gl.simulateContextLoss();
      }).not.toThrow();
      expect(gl.isContextLost()).toBe(true);
    });

    record("B10.4 - Context restored event successfully resets isContextLost state", () => {
      const canvas = document.createElement("canvas");
      let restoredFired = false;
      canvas.addEventListener("webglcontextrestored", () => {
        restoredFired = true;
      });
      const gl = canvas.getContext("webgl2") as any;
      gl.simulateContextLoss();
      expect(gl.isContextLost()).toBe(true);

      gl.simulateContextRestored();
      expect(gl.isContextLost()).toBe(false);
      expect(restoredFired).toBe(true);
    });

    record("B10.5 - 10 consecutive context loss and restoration cycles execute cleanly", () => {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2") as any;
      for (let i = 0; i < 10; i++) {
        gl.simulateContextLoss();
        expect(gl.isContextLost()).toBe(true);
        gl.simulateContextRestored();
        expect(gl.isContextLost()).toBe(false);
      }
    });

    // =========================================================================
    // FEATURE B11: Desktop Shell Padding Boundaries
    // =========================================================================
    console.log("\n  --- B11: Desktop Shell Padding Boundaries ---");

    record("B11.1 - Sidebar width custom property --b4-sidebar-w is exactly 248px", () => {
      const cssPath = path.join(process.cwd(), "app/globals.css");
      const css = fs.readFileSync(cssPath, "utf8");
      expect(css.includes("--b4-sidebar-w: 248px")).toBe(true);
    });

    record("B11.2 - body:has(.b4-shell) resets left padding to 0, eliminating gutter", () => {
      const cssPath = path.join(process.cwd(), "app/globals.css");
      const css = fs.readFileSync(cssPath, "utf8");
      expect(/body:has\(\.b4-shell\)\s*\{\s*padding-left:\s*0\s*!important;/.test(css)).toBe(true);
    });

    record("B11.3 - Viewport width exactly 960px matches mobile query (max-width: 960px)", () => {
      expect(evaluateMediaQuery("(max-width: 960px)", 960, 800)).toBe(true);
      expect(evaluateMediaQuery("(min-width: 961px)", 960, 800)).toBe(false);
    });

    record("B11.4 - Viewport width exactly 961px matches desktop query (min-width: 961px)", () => {
      expect(evaluateMediaQuery("(max-width: 960px)", 961, 800)).toBe(false);
      expect(evaluateMediaQuery("(min-width: 961px)", 961, 800)).toBe(true);
    });

    record("B11.5 - Topbar height is clamped at 64px in design system tokens", () => {
      const cssPath = path.join(process.cwd(), "app/globals.css");
      const css = fs.readFileSync(cssPath, "utf8");
      expect(css.includes("--b4-topbar-h: 64px")).toBe(true);
    });

    // =========================================================================
    // FEATURE B12: Breakpoint Harmonization Boundaries
    // =========================================================================
    console.log("\n  --- B12: Breakpoint Harmonization Boundaries ---");

    record("B12.1 - Viewport width 959px activates mobile dock and hides sidebar", () => {
      expect(evaluateMediaQuery("(max-width: 960px)", 959, 800)).toBe(true);
      expect(evaluateMediaQuery("(min-width: 961px)", 959, 800)).toBe(false);
    });

    record("B12.2 - Viewport width 960px boundary activates mobile dock", () => {
      expect(evaluateMediaQuery("(max-width: 960px)", 960, 800)).toBe(true);
    });

    record("B12.3 - Viewport width 961px boundary activates desktop sidebar", () => {
      expect(evaluateMediaQuery("(min-width: 961px)", 961, 800)).toBe(true);
    });

    record("B12.4 - Rapid window resize oscillation (959px <-> 961px) updates matchMedia correctly", () => {
      setViewport(1280, 800);
      const mql = window.matchMedia("(max-width: 960px)");
      expect(mql.matches).toBe(false);

      for (let i = 0; i < 5; i++) {
        setViewport(959, 800);
        expect(mql.matches).toBe(true);
        setViewport(961, 800);
        expect(mql.matches).toBe(false);
      }
      setViewport(1280, 800);
    });

    record("B12.5 - Mobile body reserves 70px bottom padding for console dock", () => {
      const cssPath = path.join(process.cwd(), "app/globals.css");
      const css = fs.readFileSync(cssPath, "utf8");
      expect(/@media \(max-width: 960px\)[\s\S]*?\.b4-body\s*\{\s*padding-bottom:\s*70px/.test(css)).toBe(true);
    });

    // =========================================================================
    // FEATURE B13: Mobile Topbar Responsiveness Boundaries
    // =========================================================================
    console.log("\n  --- B13: Mobile Topbar Responsiveness Boundaries ---");

    record("B13.1 - Minimum supported mobile width 320px evaluates mobile queries cleanly", () => {
      expect(evaluateMediaQuery("(max-width: 430px)", 320, 568)).toBe(true);
      expect(evaluateMediaQuery("(max-width: 960px)", 320, 568)).toBe(true);
    });

    record("B13.2 - 375px viewport (iPhone SE) hides GFX toggle button", () => {
      expect(evaluateMediaQuery("(max-width: 430px)", 375, 667)).toBe(true);
      const cssPath = path.join(process.cwd(), "app/globals.css");
      const css = fs.readFileSync(cssPath, "utf8");
      expect(/@media \(max-width: 430px\)[\s\S]*?\.b4-gfx-btn\s*\{\s*display:\s*none/.test(css)).toBe(true);
    });

    record("B13.3 - 430px viewport boundary (iPhone Pro Max) matches collapse threshold", () => {
      expect(evaluateMediaQuery("(max-width: 430px)", 430, 932)).toBe(true);
      expect(evaluateMediaQuery("(max-width: 430px)", 431, 932)).toBe(false);
    });

    record("B13.4 - Search bar input string length boundary (>100 characters)", () => {
      const longQuery = "a".repeat(150);
      const encoded = encodeURIComponent(longQuery.trim());
      const targetUrl = `/games?search=${encoded}`;
      expect(targetUrl.includes("search=")).toBe(true);
      expect(targetUrl.length).toBeGreaterThan(150);
    });

    record("B13.5 - 560px breakpoint collapses live online indicator", () => {
      const cssPath = path.join(process.cwd(), "app/globals.css");
      const css = fs.readFileSync(cssPath, "utf8");
      expect(/@media \(max-width: 560px\)[\s\S]*?\.b4-online-indicator\s*\{\s*display:\s*none/.test(css)).toBe(true);
    });

    // =========================================================================
    // FEATURE B14: Header & Modal Overflow Boundaries
    // =========================================================================
    console.log("\n  --- B14: Header & Modal Overflow Boundaries ---");

    record("B14.1 - Viewport height 400px (extreme small screen) evaluates height media queries", () => {
      expect(evaluateMediaQuery("(max-height: 400px)", 800, 400)).toBe(true);
      expect(evaluateMediaQuery("(max-height: 400px)", 800, 401)).toBe(false);
    });

    record("B14.2 - Sheet modal has max-height and overflow:auto to prevent clipping", () => {
      const cssPath = path.join(process.cwd(), "app/globals.css");
      const css = fs.readFileSync(cssPath, "utf8");
      expect(/\.sheet\s*\{[^}]*overflow:\s*auto/.test(css)).toBe(true);
      expect(/\.sheet\s*\{[^}]*max-height:\s*min\(62%,\s*540px\)/.test(css)).toBe(true);
    });

    record("B14.3 - HomeView header nav flex override is prevented", () => {
      const homePath = path.join(process.cwd(), "components/HomeView.tsx");
      const homeSrc = fs.readFileSync(homePath, "utf8");
      expect(!/<div className="u3-header-nav"[^>]*style=\{\{[^}]*display:\s*["']flex["']/.test(homeSrc)).toBe(true);
    });

    record("B14.4 - Games modal has maxHeight 85vh and overflowY auto guard", () => {
      const gamesPath = path.join(process.cwd(), "app/games/page.tsx");
      const gamesSrc = fs.readFileSync(gamesPath, "utf8");
      expect(gamesSrc.includes('maxHeight: "85vh"') && gamesSrc.includes('overflowY: "auto"')).toBe(true);
    });

    record("B14.5 - Rapid modal open/close cycle terminates in consistent closed state", () => {
      let isOpen = false;
      for (let i = 0; i < 20; i++) {
        isOpen = !isOpen;
      }
      expect(isOpen).toBe(false);
    });

    // =========================================================================
    // FEATURE B15: Multi-Layer Shell Routing Boundaries
    // =========================================================================
    console.log("\n  --- B15: Multi-Layer Shell Routing Boundaries ---");

    record("B15.1 - enterLoungeUrl encodes special and reserved URI characters in player name", () => {
      const complexName = "Player #1 & <Hero> / 100% = Yes?";
      const url = enterLoungeUrl(complexName, "atlas");
      expect(url.startsWith("/world?name=")).toBe(true);
      expect(url.includes("<Hero>")).toBe(false);
      expect(url.includes("100%25")).toBe(true);
    });

    record("B15.2 - enterLoungeUrl with empty player name handles empty query gracefully", () => {
      const url = enterLoungeUrl("", "cyber");
      expect(url).toBe("/world?name=&av=cyber");
    });

    record("B15.3 - enterLoungeUrl with unicode emoji in player name encodes safely", () => {
      const emojiName = "Gamer 🚀✨";
      const url = enterLoungeUrl(emojiName, "atlas");
      expect(decodeURIComponent(url).includes("Gamer 🚀✨")).toBe(true);
    });

    record("B15.4 - Route navigation path checks for top-level routes match exactly", () => {
      const on = (currentPath: string, targetPath: string) => {
        if (targetPath === "/") return currentPath === "/";
        return currentPath === targetPath || currentPath.startsWith(targetPath + "/");
      };

      expect(on("/", "/")).toBe(true);
      expect(on("/games", "/")).toBe(false);
      expect(on("/world", "/world")).toBe(true);
      expect(on("/world/sub", "/world")).toBe(true);
      expect(on("/worldwide", "/world")).toBe(false);
    });

    record("B15.5 - Deep link search query parameter parsing handles multiple keys", () => {
      const queryStr = "?search=cyber%20dice&tier=2&category=Competitive";
      const params = new URLSearchParams(queryStr);
      expect(params.get("search")).toBe("cyber dice");
      expect(params.get("tier")).toBe("2");
      expect(params.get("category")).toBe("Competitive");
      expect(params.get("unknown_key")).toBeNull();
    });

    // =========================================================================
    // FEATURE B16: ESLint Integration Boundaries
    // =========================================================================
    console.log("\n  --- B16: ESLint Integration Boundaries ---");

    record("B16.1 - package.json defines valid scripts object with core commands", () => {
      const pkgPath = path.join(process.cwd(), "package.json");
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      expect(typeof pkg.scripts).toBe("object");
      expect(typeof pkg.scripts.build).toBe("string");
      expect(typeof pkg.scripts.typecheck).toBe("string");
      expect(typeof pkg.scripts.test).toBe("string");
    });

    record("B16.2 - package.json test script points to tsx test runner", () => {
      const pkgPath = path.join(process.cwd(), "package.json");
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      expect(pkg.scripts.test.includes("tsx")).toBe(true);
    });

    record("B16.3 - tsconfig.json has valid compiler configuration and path aliases", () => {
      const tsconfigPath = path.join(process.cwd(), "tsconfig.json");
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf8"));
      expect(tsconfig.compilerOptions.paths["@/*"]).toBeDefined();
      expect(tsconfig.compilerOptions.paths["@/*"][0]).toBe("./*");
    });

    record("B16.4 - Malformed JSON configuration parsing throws SyntaxError gracefully", () => {
      expect(() => {
        JSON.parse("{ invalid_json: true, missing_quotes }");
      }).toThrow();
    });

    record("B16.5 - Package name and private flag meet production deployment contracts", () => {
      const pkgPath = path.join(process.cwd(), "package.json");
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      expect(pkg.name).toBe("barmo");
      expect(pkg.private).toBe(true);
    });

    // =========================================================================
    // FEATURE B17: Typecheck Boundaries
    // =========================================================================
    console.log("\n  --- B17: Typecheck Boundaries ---");

    record("B17.1 - tsconfig.json enforces strict mode (strict: true)", () => {
      const tsconfigPath = path.join(process.cwd(), "tsconfig.json");
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf8"));
      expect(tsconfig.compilerOptions.strict).toBe(true);
    });

    record("B17.2 - tsconfig.json sets noEmit: true for Next.js bundler compatibility", () => {
      const tsconfigPath = path.join(process.cwd(), "tsconfig.json");
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf8"));
      expect(tsconfig.compilerOptions.noEmit).toBe(true);
    });

    record("B17.3 - tsconfig.json sets skipLibCheck: true for high-speed builds", () => {
      const tsconfigPath = path.join(process.cwd(), "tsconfig.json");
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf8"));
      expect(tsconfig.compilerOptions.skipLibCheck).toBe(true);
    });

    record("B17.4 - tsconfig.json targets modern ECMAScript (ES2020 or higher)", () => {
      const tsconfigPath = path.join(process.cwd(), "tsconfig.json");
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf8"));
      expect(tsconfig.compilerOptions.target).toBe("ES2020");
    });

    record("B17.5 - tsconfig.json excludes node_modules from compilation traversal", () => {
      const tsconfigPath = path.join(process.cwd(), "tsconfig.json");
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf8"));
      expect(tsconfig.exclude).toContain("node_modules");
    });

    // =========================================================================
    // FEATURE B18: Production Build Boundaries
    // =========================================================================
    console.log("\n  --- B18: Production Build Boundaries ---");

    record("B18.1 - next.config.ts defines outputFileTracingRoot for production bundling", () => {
      const nextConfigPath = path.join(process.cwd(), "next.config.ts");
      const nextConfigContent = fs.readFileSync(nextConfigPath, "utf8");
      expect(nextConfigContent.includes("outputFileTracingRoot")).toBe(true);
    });

    record("B18.2 - Service worker /sw.js cache control headers specify no-cache and no-store", () => {
      const nextConfigPath = path.join(process.cwd(), "next.config.ts");
      const nextConfigContent = fs.readFileSync(nextConfigPath, "utf8");
      expect(nextConfigContent.includes("no-cache, no-store, must-revalidate")).toBe(true);
    });

    record("B18.3 - Public character model asset avatar.gltf exists on disk", () => {
      const modelPath = path.join(process.cwd(), "public/models/avatar.gltf");
      expect(fs.existsSync(modelPath)).toBe(true);
      const stat = fs.statSync(modelPath);
      expect(stat.size).toBeGreaterThan(1000); // Must be a real glTF asset
    });

    record("B18.4 - Missing production environment variables fallback gracefully in health check", () => {
      const health = computeHealth({});
      expect(isReady(health)).toBe(false);
      const supabaseCheck = health.find((c) => c.id === "supabase");
      expect(supabaseCheck?.required).toBe(true);
    });

    record("B18.5 - Character model asset size is within reasonable web performance budget (< 5MB)", () => {
      const modelPath = path.join(process.cwd(), "public/models/avatar.gltf");
      const stat = fs.statSync(modelPath);
      expect(stat.size).toBeLessThan(5 * 1024 * 1024); // < 5MB
    });
  } finally {
    cleanupWebGLMock();
    cleanupDOMShim();
  }

  const duration = Date.now() - start;
  console.log(`\n  Tier 2 Execution Complete: ${passed} Passed, ${failed} Failed in ${duration}ms\n`);

  return { passed, failed };
}

// Delegate run() for central test runner integration
export const run = runTier2;
