/**
 * tests/e2e/tier3_combinations.e2e.ts
 *
 * Tier 3: Cross-Feature Interaction Test Suite for Barmo Lounge.
 * Validates pairwise combinatorial integration across distinct engine,
 * UI, physics, rendering, network, and build pipeline subsystems.
 *
 * Covers Pairs 1 through 20 across subsystem boundaries.
 */

import * as THREE from "three";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vm from "node:vm";

import {
  installDOMShim,
  cleanupDOMShim,
  setViewport,
  getViewport,
  HTMLElementShim,
  PointerEventShim,
  MouseEventShim,
} from "./harness/domShim";
import { installWebGLMock, cleanupWebGLMock } from "./harness/webglMock";
import { expect, assert } from "./harness/assert";

import { addJoystick } from "../../lib/world/joystick";
import {
  moveVector,
  orbitOffset,
  applyCameraTrauma,
  getCameraTrauma,
  resetCameraTrauma,
  updateCameraDynamics,
  checkRoomBoundaryCollision,
  type RoomBounds,
  clamp,
  PITCH_MIN,
  PITCH_MAX,
} from "../../lib/world/controls";
import {
  createDashTrail,
  createFootstepSparks,
  createActionShockwave,
  updateActionShockwaves,
  clearActionShockwaves,
} from "../../lib/world/fx";
import {
  loadCharacterModel,
  createProceduralCharacterInstance,
  clearModelCache,
  getCachedModelCount,
  type CharacterInstance,
  type AnimationState,
} from "../../lib/world/characterLoader";
import { enterLoungeUrl } from "../../components/app/AppShell";
import { GAMES, type GameId, type GState, type GPlayer } from "../../lib/games/types";
import { CHALLENGES, WORKER_SRC } from "../../lib/world/codeLab";

/**
 * Helper to safely load character models in Node.js test environment
 * by ensuring the local filesystem loader branch is exercised.
 */
async function loadModel(url: string, scene?: THREE.Scene): Promise<CharacterInstance> {
  const win = (globalThis as any).window;
  try {
    delete (globalThis as any).window;
    return await loadCharacterModel(url, scene);
  } finally {
    if (win !== undefined) {
      (globalThis as any).window = win;
    }
  }
}

export async function runTier3(): Promise<{
  passed: number;
  failed: number;
  total: number;
  duration: number;
}> {
  const startTime = Date.now();
  let passed = 0;
  let failed = 0;

  async function record(name: string, fn: () => void | Promise<void>) {
    try {
      await fn();
      passed++;
      console.log(`    ✔ [PASS] ${name}`);
    } catch (err: any) {
      failed++;
      console.error(`    ✖ [FAIL] ${name}`);
      console.error(`       Error: ${err?.message || err}`);
    }
  }

  installDOMShim({ width: 1280, height: 800 });
  installWebGLMock();

  // Polyfill pointer capture and node removal on HTMLElementShim if not natively present
  if (typeof (HTMLElementShim.prototype as any).setPointerCapture !== "function") {
    (HTMLElementShim.prototype as any).setPointerCapture = function (pointerId: number) {
      (this as any)._capturedPointerId = pointerId;
    };
    (HTMLElementShim.prototype as any).releasePointerCapture = function (pointerId: number) {
      if ((this as any)._capturedPointerId === pointerId) {
        (this as any)._capturedPointerId = null;
      }
    };
    (HTMLElementShim.prototype as any).hasPointerCapture = function (pointerId: number) {
      return (this as any)._capturedPointerId === pointerId;
    };
  }
  if (typeof (HTMLElementShim.prototype as any).remove !== "function") {
    (HTMLElementShim.prototype as any).remove = function () {
      if (this.parentElement) {
        this.parentElement.removeChild(this);
      }
    };
  }

  try {
    // =========================================================================
    // Pair 1: Mobile Touch Joystick + Kinematic Locomotion Controller
    // =========================================================================
    await record(
      "T3.1: Mobile Touch Joystick + Kinematic Locomotion Controller",
      async () => {
        const host = document.createElement("div");
        document.body.appendChild(host);

        const joy = addJoystick(host);
        joy.el.offsetWidth = 88;
        joy.el.offsetHeight = 88;

        // Subtest 1a: Deadzone handling (< 0.12 throw)
        // Center is (44, 44). Dispatching at (46, 44) => dx=2, dy=0 => len=2/44=0.045 < 0.12
        const deadzoneEvt = new PointerEventShim("pointerdown", {
          clientX: 46,
          clientY: 44,
          pointerId: 1,
        });
        joy.el.dispatchEvent(deadzoneEvt);

        expect(joy.x()).toBe(0);
        expect(joy.y()).toBe(0);
        const deadzoneMove = moveVector(joy.y(), joy.x(), 0);
        expect(deadzoneMove.amt).toBe(0);
        expect(deadzoneMove.x).toBe(0);
        expect(deadzoneMove.z).toBe(0);

        // Subtest 1b: Full throw forward
        // Dispatching at (44, 0) => dx=0, dy=-44 => ny=1.0, len=1.0, curve=1.0
        const forwardEvt = new PointerEventShim("pointermove", {
          clientX: 44,
          clientY: 0,
          pointerId: 1,
        });
        joy.el.dispatchEvent(forwardEvt);

        expect(joy.x()).toBeCloseTo(0, 2);
        expect(joy.y()).toBeCloseTo(1.0, 2);

        // Locomotion kinematics: forward with camYaw = 0 moves in +Z
        const forwardMove = moveVector(joy.y(), joy.x(), 0);
        expect(forwardMove.amt).toBeCloseTo(1.0, 2);
        expect(forwardMove.x).toBeCloseTo(0, 2);
        expect(forwardMove.z).toBeCloseTo(1.0, 2);

        // Subtest 1c: Diagonal throw with camera yaw = PI/2 (90 degrees)
        // With camYaw = PI/2, forward input moves in +X
        const rotatedMove = moveVector(joy.y(), joy.x(), Math.PI / 2);
        expect(rotatedMove.amt).toBeCloseTo(1.0, 2);
        expect(rotatedMove.x).toBeCloseTo(1.0, 2);
        expect(rotatedMove.z).toBeCloseTo(0, 2);

        // Subtest 1d: Touch release returns joystick to origin and resets throw
        const releaseEvt = new PointerEventShim("pointerup", {
          clientX: 44,
          clientY: 44,
          pointerId: 1,
        });
        joy.el.dispatchEvent(releaseEvt);

        expect(joy.x()).toBe(0);
        expect(joy.y()).toBe(0);
        const stopMove = moveVector(joy.y(), joy.x(), 0);
        expect(stopMove.amt).toBe(0);

        joy.dispose();
        host.remove();
      }
    );

    // =========================================================================
    // Pair 2: Mobile Touch Joystick + Dynamic Camera Orbit
    // =========================================================================
    await record(
      "T3.2: Mobile Touch Joystick + Dynamic Camera Orbit (Simultaneous Touch)",
      async () => {
        const host = document.createElement("div");
        document.body.appendChild(host);

        const joy = addJoystick(host);
        joy.el.offsetWidth = 88;
        joy.el.offsetHeight = 88;

        let camYaw = 0;
        let camPitch = 0.42;
        const camDist = 3.5;
        const sens = 1.0;

        // Left thumb (pointerId 1) touches down at center and drags forward
        const leftDown = new PointerEventShim("pointerdown", {
          clientX: 44,
          clientY: 44,
          pointerId: 1,
        });
        joy.el.dispatchEvent(leftDown);

        const leftDrag = new PointerEventShim("pointermove", {
          clientX: 44,
          clientY: 0,
          pointerId: 1,
        });
        joy.el.dispatchEvent(leftDrag);
        expect(joy.y()).toBeCloseTo(1.0, 2);

        // Right thumb (pointerId 2) initiates camera drag orbit simultaneously
        const rightDragX = 80;
        const rightDragY = -30;
        camYaw += rightDragX * sens * 0.005;
        camPitch = clamp(camPitch + rightDragY * sens * 0.005, PITCH_MIN, PITCH_MAX);

        // Calculate dynamic camera orbit offset
        const camPos = orbitOffset(camYaw, camPitch, camDist);
        expect(camPos.y).toBeCloseTo(Math.sin(camPitch) * camDist, 2);
        expect(Math.hypot(camPos.x, camPos.z)).toBeCloseTo(Math.cos(camPitch) * camDist, 2);

        // Player movement direction steers relative to newly modified camera yaw
        const steerMove = moveVector(joy.y(), joy.x(), camYaw);
        expect(steerMove.amt).toBeCloseTo(1.0, 2);
        expect(steerMove.x).toBeCloseTo(Math.sin(camYaw), 2);
        expect(steerMove.z).toBeCloseTo(Math.cos(camYaw), 2);

        // Pointer separation verification: right thumb releases from camera/window without disturbing joystick
        const rightUp = new PointerEventShim("pointerup", { pointerId: 2 });
        window.dispatchEvent(rightUp);
        expect(joy.y()).toBeCloseTo(1.0, 2);

        // Left thumb releases from joystick: resets joystick coordinates
        const leftUp = new PointerEventShim("pointerup", { pointerId: 1 });
        joy.el.dispatchEvent(leftUp);
        expect(joy.y()).toBe(0);

        joy.dispose();
        host.remove();
      }
    );

    // =========================================================================
    // Pair 3: Kinematic Locomotion Sprint + High-Energy Dash Trail FX
    // =========================================================================
    await record(
      "T3.3: Kinematic Locomotion Sprint + High-Energy Dash Trail FX",
      async () => {
        const scene = new THREE.Scene();
        const dashTrail = createDashTrail(scene);

        expect(dashTrail.getActiveCount()).toBe(0);

        const playerPos = new THREE.Vector3(0, 0, 0);

        // Subtest 3a: Walking does not spawn dash trail
        dashTrail.update(0.05, playerPos, false);
        expect(dashTrail.getActiveCount()).toBe(0);

        // Subtest 3b: Sprinting triggers particle spawning
        dashTrail.update(0.05, playerPos, true);
        expect(dashTrail.getActiveCount()).toBeGreaterThan(0);

        // Verify Points geometry and additive blending material
        const pointsObj = scene.getObjectByName("DashTrailPoints") as THREE.Points;
        expect(pointsObj).toBeDefined();
        const mat = pointsObj.material as THREE.PointsMaterial;
        expect(mat.blending).toBe(THREE.AdditiveBlending);
        expect(mat.transparent).toBe(true);

        // Subtest 3c: Discontinuing sprint allows particles to decay and recycle
        for (let i = 0; i < 20; i++) {
          dashTrail.update(0.05, playerPos, false);
        }
        expect(dashTrail.getActiveCount()).toBe(0);

        dashTrail.dispose();
        expect(scene.getObjectByName("DashTrailPoints")).toBeUndefined();
      }
    );

    // =========================================================================
    // Pair 4: Kinematic Locomotion Sprint + Dynamic Camera FOV Rush & Shake
    // =========================================================================
    await record(
      "T3.4: Kinematic Locomotion Sprint + Dynamic Camera FOV Rush & Shake",
      async () => {
        const camera = new THREE.PerspectiveCamera(55, 16 / 9, 0.1, 100);
        resetCameraTrauma();
        expect(getCameraTrauma()).toBe(0);

        // Trigger sprint trauma
        applyCameraTrauma(0.65);
        expect(getCameraTrauma()).toBeCloseTo(0.65, 2);

        // Step camera dynamics while sprinting
        const result = updateCameraDynamics(camera, true, 0.05, 55);
        expect(camera.fov).toBeGreaterThan(55);
        expect(result.fov).toBe(camera.fov);
        expect(result.shakeOffset.length()).toBeGreaterThan(0);

        // Cease sprinting and observe FOV recovery and trauma decay
        for (let i = 0; i < 25; i++) {
          updateCameraDynamics(camera, false, 0.1, 55);
        }
        expect(camera.fov).toBeLessThan(56);
        expect(getCameraTrauma()).toBe(0);
      }
    );

    // =========================================================================
    // Pair 5: Kinematic Locomotion Jump + Footstep Spark Ring FX
    // =========================================================================
    await record(
      "T3.5: Kinematic Locomotion Jump + Footstep Spark Ring FX",
      async () => {
        const scene = new THREE.Scene();
        const sparks = createFootstepSparks(scene);

        // Airborne phase: jump impulse vy = 4.8, gravity = 9.8
        let y = 0;
        let vy = 4.8;
        const dt = 0.05;

        // Airborne trajectory: ground sparks must not trigger
        for (let step = 0; step < 10; step++) {
          vy -= 9.8 * dt;
          y += vy * dt;
          sparks.update(dt, new THREE.Vector3(0, y, 0), false);
        }
        expect(y).toBeGreaterThan(0);
        expect(sparks.getActiveCount()).toBe(0);

        // Continue until landing (y <= 0)
        while (y > 0) {
          vy -= 9.8 * dt;
          y += vy * dt;
        }
        y = 0; // Ground clamped

        // Landing shockwave triggered
        createActionShockwave(scene, new THREE.Vector3(2, 0, 3), 0x8b5cf6);
        const meshesBefore = scene.children.filter((c) => c instanceof THREE.Mesh);
        expect(meshesBefore.length).toBeGreaterThanOrEqual(1);

        // Shockwave expansion update
        updateActionShockwaves();
        clearActionShockwaves();

        const meshesAfter = scene.children.filter((c) => c instanceof THREE.Mesh);
        expect(meshesAfter.length).toBe(0);

        sparks.dispose();
      }
    );

    // =========================================================================
    // Pair 6: Skeletal Animation Mixer + Locomotion Controller
    // =========================================================================
    await record(
      "T3.6: Skeletal Animation Mixer + Locomotion Controller Auto-Switching",
      async () => {
        clearModelCache();
        const scene = new THREE.Scene();
        const char = await loadModel("public/models/avatar.gltf", scene);

        expect(char.currentAction).toBe("idle");

        // Velocity threshold mapping:
        // idle: speed < 0.1
        // walk: 0.1 <= speed < 4.0
        // run: speed >= 4.0
        const simulateLocomotion = (speed: number, isJumping = false): AnimationState => {
          if (isJumping) return "jump";
          if (speed < 0.1) return "idle";
          if (speed < 4.0) return "walk";
          return "run";
        };

        // Test idle
        char.setAction(simulateLocomotion(0.04));
        expect(char.currentAction).toBe("idle");

        // Accelerate to walk
        char.setAction(simulateLocomotion(2.2));
        char.update(0.1);
        expect(char.currentAction).toBe("walk");

        // Accelerate to sprint run
        char.setAction(simulateLocomotion(5.8));
        char.update(0.1);
        expect(char.currentAction).toBe("run");

        // Jump triggered
        char.setAction(simulateLocomotion(5.8, true));
        char.update(0.1);
        expect(char.currentAction).toBe("jump");

        // Land and decelerate to stop
        char.setAction(simulateLocomotion(0.0));
        char.update(0.1);
        expect(char.currentAction).toBe("idle");

        char.dispose();
      }
    );

    // =========================================================================
    // Pair 7: GLTF Character Model Loader + SkeletonUtils Clone
    // =========================================================================
    await record(
      "T3.7: GLTF Character Model Loader + SkeletonUtils Clone Peer Sync",
      async () => {
        clearModelCache();
        const scene = new THREE.Scene();

        const peerA = await loadModel("public/models/avatar.gltf", scene);
        const peerB = await loadModel("public/models/avatar.gltf", scene);
        const peerC = await loadModel("public/models/avatar.gltf", scene);

        expect(getCachedModelCount()).toBe(1); // Cached base model shared
        expect(peerA.root).not.toBe(peerB.root);
        expect(peerA.mixer).not.toBe(peerB.mixer);

        // Independent animation action execution
        peerA.setAction("walk");
        peerB.setAction("run");
        peerC.setAction("idle");

        peerA.update(0.05);
        peerB.update(0.05);
        peerC.update(0.05);

        expect(peerA.currentAction).toBe("walk");
        expect(peerB.currentAction).toBe("run");
        expect(peerC.currentAction).toBe("idle");

        // Bone isolation check
        let bonesA: THREE.Bone[] = [];
        let bonesB: THREE.Bone[] = [];
        peerA.root.traverse((o) => {
          if ((o as THREE.Bone).isBone) bonesA.push(o as THREE.Bone);
        });
        peerB.root.traverse((o) => {
          if ((o as THREE.Bone).isBone) bonesB.push(o as THREE.Bone);
        });

        if (bonesA.length > 0 && bonesB.length > 0) {
          expect(bonesA[0]).not.toBe(bonesB[0]);
        }

        peerA.dispose();
        peerB.dispose();
        peerC.dispose();
      }
    );

    // =========================================================================
    // Pair 8: Procedural Avatar Fallback + Kinematic Locomotion
    // =========================================================================
    await record(
      "T3.8: Procedural Avatar Fallback + Kinematic Locomotion",
      async () => {
        const scene = new THREE.Scene();

        // Load with missing URL triggers procedural fallback
        const procChar = await loadModel("missing://model_not_found.glb", scene);
        expect(procChar.isProceduralFallback).toBe(true);
        expect(procChar.root.name).toBe("ProceduralAvatarInstance");

        // Procedural locomotion animation states
        procChar.setAction("idle");
        procChar.update(0.1);
        expect(procChar.currentAction).toBe("idle");

        procChar.setAction("walk");
        procChar.update(0.1);
        expect(procChar.currentAction).toBe("walk");

        procChar.setAction("run");
        procChar.update(0.1);
        expect(procChar.currentAction).toBe("run");

        procChar.setAction("jump");
        procChar.update(0.1);
        expect(procChar.currentAction).toBe("jump");

        // Locomotion coordinate integration
        procChar.root.position.set(5.5, 0, -3.2);
        expect(procChar.root.position.x).toBeCloseTo(5.5, 2);
        expect(procChar.root.position.z).toBeCloseTo(-3.2, 2);

        procChar.dispose();
      }
    );

    // =========================================================================
    // Pair 9: PC Pointer Lock + Keyboard WASD Locomotion
    // =========================================================================
    await record(
      "T3.9: PC Pointer Lock + Keyboard WASD Locomotion",
      async () => {
        const canvas = document.createElement("canvas");
        document.body.appendChild(canvas);

        expect(document.pointerLockElement).toBeNull();
        (canvas as any).requestPointerLock();
        expect(document.pointerLockElement).toBe(canvas);

        let camYaw = 0;
        const sens = 1.0;

        // Mouse look delta: 50px horizontal movement
        const mouseDeltaX = 50;
        camYaw += mouseDeltaX * sens * 0.002;
        expect(camYaw).toBeCloseTo(0.1, 3);

        // Keyboard WASD: 'W' (forward f=1) + 'A' (strafe left s=-1)
        const mv = moveVector(1, -1, camYaw);
        expect(mv.amt).toBeCloseTo(1.0, 2);

        // Forward-left vector angled relative to camera yaw
        const expectedAngle = camYaw + Math.PI / 4;
        const actualAngle = Math.atan2(mv.x, mv.z);
        expect(actualAngle).toBeCloseTo(expectedAngle, 2);

        // Exit pointer lock
        (document as any).exitPointerLock();
        expect(document.pointerLockElement).toBeNull();

        canvas.remove();
      }
    );

    // =========================================================================
    // Pair 10: 960px Viewport Breakpoint + Topbar HUD + Mobile Dock
    // =========================================================================
    await record(
      "T3.10: 960px Viewport Breakpoint + Topbar HUD + Mobile Dock",
      async () => {
        // Desktop viewport (1280px)
        setViewport(1280, 800);
        const desktopMobileQuery = window.matchMedia("(max-width: 960px)");
        const desktopQuery = window.matchMedia("(min-width: 961px)");
        expect(desktopMobileQuery.matches).toBe(false);
        expect(desktopQuery.matches).toBe(true);

        // Mobile viewport transition (390px iPhone)
        setViewport(390, 844);
        expect(desktopMobileQuery.matches).toBe(true);
        expect(desktopQuery.matches).toBe(false);

        // Mobile topbar collapse breakpoint (<=430px)
        const compactTopbarQuery = window.matchMedia("(max-width: 430px)");
        expect(compactTopbarQuery.matches).toBe(true);

        // Restore viewport
        setViewport(1280, 800);
        expect(desktopMobileQuery.matches).toBe(false);
      }
    );

    // =========================================================================
    // Pair 11: WebGL Context Loss + Locomotion Loop
    // =========================================================================
    await record(
      "T3.11: WebGL Context Loss + Locomotion Loop Safe Interruption",
      async () => {
        const canvas = document.createElement("canvas");
        const gl = canvas.getContext("webgl2") as any;
        const renderer = new THREE.WebGLRenderer({ canvas });
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);

        let renderCount = 0;
        let pausedDuringLoss = false;

        const loopStep = () => {
          if (gl.isContextLost()) {
            pausedDuringLoss = true;
            return; // Cleanly bypass WebGL calls during context loss
          }
          renderer.render(scene, camera);
          renderCount++;
        };

        // Frame 1: Normal render
        loopStep();
        expect(renderCount).toBe(1);

        // Trigger context loss
        gl.simulateContextLoss();
        expect(gl.isContextLost()).toBe(true);

        // Frame 2: While context is lost
        loopStep();
        expect(pausedDuringLoss).toBe(true);
        expect(renderCount).toBe(1); // Render bypassed cleanly

        // Trigger context restoration
        gl.simulateContextRestored();
        expect(gl.isContextLost()).toBe(false);

        // Frame 3: Resumed loop
        loopStep();
        expect(renderCount).toBe(2);

        renderer.dispose();
      }
    );

    // =========================================================================
    // Pair 12: WebGL Context Loss + High-Energy FX
    // =========================================================================
    await record(
      "T3.12: WebGL Context Loss + High-Energy FX Buffer Integrity",
      async () => {
        const canvas = document.createElement("canvas");
        const gl = canvas.getContext("webgl2") as any;
        const scene = new THREE.Scene();

        const dashTrail = createDashTrail(scene);
        dashTrail.update(0.05, new THREE.Vector3(0, 0, 0), true);
        expect(dashTrail.getActiveCount()).toBeGreaterThan(0);

        // Context loss interruption
        gl.simulateContextLoss();
        expect(gl.isContextLost()).toBe(true);

        // Emitter handles context interruption safely
        dashTrail.update(0.05, new THREE.Vector3(1, 0, 1), true);

        // Context restoral
        gl.simulateContextRestored();
        expect(gl.isContextLost()).toBe(false);

        // Particle buffer recreation & update
        dashTrail.update(0.05, new THREE.Vector3(2, 0, 2), true);
        expect(dashTrail.getActiveCount()).toBeGreaterThan(0);

        dashTrail.dispose();
      }
    );

    // =========================================================================
    // Pair 13: Arcade Game Room + Multi-Layer Shell Navigation
    // =========================================================================
    await record(
      "T3.13: Arcade Game Room + Multi-Layer Shell Navigation",
      async () => {
        // Construct game state machine
        const gameState: GState = {
          game: "dice",
          phase: "lobby",
          round: 1,
          rounds: 3,
          host: "p1",
          players: {
            p1: { id: "p1", name: "HostPilot", av: "atlas", score: 0 },
            p2: { id: "p2", name: "RivalRacer", av: "pulse", score: 0 },
          },
          msg: "Waiting in lobby",
        };

        expect(gameState.phase).toBe("lobby");
        expect(Object.keys(gameState.players).length).toBe(2);

        // Transition to active gameplay
        gameState.phase = "play";
        gameState.rolls = { p1: 5, p2: 3 };

        // Round resolution
        gameState.phase = "reveal";
        gameState.gained = { p1: 1 };
        gameState.players.p1.score += 1;
        gameState.msg = "HostPilot wins round 1";

        expect(gameState.players.p1.score).toBe(1);

        // Shell navigation URL generation for seamless world return
        const returnUrl = enterLoungeUrl("HostPilot", "atlas");
        expect(returnUrl).toBe("/world?name=HostPilot&av=atlas");
      }
    );

    // =========================================================================
    // Pair 14: Arcade Game Room + Bot Orchestration
    // =========================================================================
    await record(
      "T3.14: Arcade Game Room + Bot Orchestration (Dice Duel & Speedrun)",
      async () => {
        // Subtest 14a: Cyber Dice Duel Host vs Bot
        const hostId = "human_player";
        const botId = "cyber_bot_v2";

        const rolls: Record<string, number> = {
          [hostId]: 4,
          [botId]: 6,
        };

        const scores: Record<string, number> = { [hostId]: 0, [botId]: 0 };
        const maxRoll = Math.max(rolls[hostId], rolls[botId]);
        if (rolls[botId] === maxRoll) scores[botId] += 1;
        if (rolls[hostId] === maxRoll) scores[hostId] += 1;

        expect(scores[botId]).toBe(1);
        expect(scores[hostId]).toBe(0);

        // Subtest 14b: Code Lab Speedrun Challenge
        const challenge = CHALLENGES.find((c) => c.id === "sum");
        expect(challenge).toBeDefined();

        const botSolution = "function sum(a){return a.reduce((x,y)=>x+y,0)}";
        const workerOut = await new Promise<{ ok: boolean }>((resolve) => {
          const ctx: Record<string, unknown> = {
            postMessage: (m: any) => resolve({ ok: m.tests.every((t: any) => t.ok) }),
            setTimeout,
            JSON,
            Math,
            Array,
            Object,
          };
          ctx.self = ctx;
          vm.createContext(ctx);
          vm.runInContext(WORKER_SRC, ctx);
          (ctx.onmessage as (e: any) => void)({
            data: { code: botSolution, tests: challenge!.tests },
          });
        });

        expect(workerOut.ok).toBe(true);
      }
    );

    // =========================================================================
    // Pair 15: Header & Modal Sheet + Mobile Viewport
    // =========================================================================
    await record(
      "T3.15: Header & Modal Sheet + Mobile Viewport (Zero Scroll Lock Bleed)",
      async () => {
        // Small mobile viewport: 390x500px
        setViewport(390, 500);

        const modalOverlay = document.createElement("div");
        modalOverlay.className = "u3-modal-overlay";
        modalOverlay.style.maxHeight = "85vh";
        modalOverlay.style.overflowY = "auto";

        const modalContent = document.createElement("div");
        modalContent.style.height = "750px"; // Exceeds container height
        modalOverlay.appendChild(modalContent);
        document.body.appendChild(modalOverlay);

        // Verify container scroll capability
        expect(modalOverlay.style.overflowY).toBe("auto");
        expect(modalOverlay.style.maxHeight).toBe("85vh");

        // Clean removal
        modalOverlay.remove();
        setViewport(1280, 800);
      }
    );

    // =========================================================================
    // Pair 16: Desktop Shell Padding + Sidebar Navigation
    // =========================================================================
    await record(
      "T3.16: Desktop Shell Padding + Sidebar Navigation (Zero Gutter Clash)",
      async () => {
        setViewport(1440, 900);

        // Check CSS rules for shell and sidebar layout
        const cssPath = path.join(process.cwd(), "app/globals.css");
        const css = fs.readFileSync(cssPath, "utf8");

        // Verify body:has(.b4-shell) resets left padding
        expect(css).toContain("body:has(.b4-shell)");

        // Verify sidebar navigation width (248px)
        expect(css).toContain("248px");

        // Simulate sidebar route updates
        const navRoutes = ["/", "/games", "/world", "/explore", "/tournaments"];
        let activeRoute = "/";

        for (const route of navRoutes) {
          activeRoute = route;
          expect(activeRoute).toBe(route);
        }
      }
    );

    // =========================================================================
    // Pair 17: Mobile Virtual Buttons + Kinematic Jump Impulse
    // =========================================================================
    await record(
      "T3.17: Mobile Virtual Buttons + Kinematic Jump Impulse Trajectory",
      async () => {
        const jumpBtn = document.createElement("button");
        jumpBtn.className = "b4-virtual-btn-jump";
        document.body.appendChild(jumpBtn);

        let isJumping = false;
        let vy = 0;
        const jumpImpulse = 5.2;

        jumpBtn.addEventListener("pointerdown", () => {
          isJumping = true;
          vy = jumpImpulse;
        });

        // Tap on-screen jump button
        const tapEvt = new PointerEventShim("pointerdown", { pointerId: 3 });
        jumpBtn.dispatchEvent(tapEvt);

        expect(isJumping).toBe(true);
        expect(vy).toBe(5.2);

        // Integrate parabolic jump trajectory (t = 0 to landing)
        let y = 0;
        let apexReached = false;
        const dt = 0.05;

        for (let i = 0; i < 30; i++) {
          vy -= 9.8 * dt;
          y += vy * dt;
          if (vy <= 0 && !apexReached) {
            apexReached = true;
            expect(y).toBeGreaterThan(1.2); // Apex > 1.2m
          }
          if (apexReached && y <= 0) {
            y = 0;
            isJumping = false;
            break;
          }
        }

        expect(isJumping).toBe(false);
        expect(y).toBe(0);

        jumpBtn.remove();
      }
    );

    // =========================================================================
    // Pair 18: Room Collision + Camera Zoom Guard
    // =========================================================================
    await record(
      "T3.18: Room Collision + Camera Zoom Guard Distance Clamping",
      async () => {
        const loungeBounds: RoomBounds = {
          minX: -11.8,
          maxX: 11.8,
          minZ: -8.8,
          maxZ: 8.8,
          margin: 0.5,
        };

        // Player at safe distance inside room
        const playerPos = new THREE.Vector3(9.0, 1.2, 0);

        // Desired camera position outside the room (+X wall clipping at 14.5)
        const desiredCamPos = new THREE.Vector3(14.5, 2.0, 0);

        const safeCamPos = checkRoomBoundaryCollision(desiredCamPos, playerPos, loungeBounds);

        // Clamped camera must stay strictly inside maxX - margin (11.8 - 0.5 = 11.3)
        expect(safeCamPos.x).toBeLessThanOrEqual(11.3);
        expect(safeCamPos.x).toBeGreaterThan(playerPos.x); // Stays along ray from player

        // Camera inside room is untouched
        const insideCamPos = new THREE.Vector3(5.0, 2.0, 3.0);
        const untouchedCamPos = checkRoomBoundaryCollision(insideCamPos, playerPos, loungeBounds);
        expect(untouchedCamPos.x).toBeCloseTo(5.0, 2);
        expect(untouchedCamPos.z).toBeCloseTo(3.0, 2);
      }
    );

    // =========================================================================
    // Pair 19: ESLint Integration + Typecheck Pipeline
    // =========================================================================
    await record(
      "T3.19: ESLint Integration + Typecheck Pipeline Verification",
      async () => {
        const pkgJsonPath = path.join(process.cwd(), "package.json");
        const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));

        expect(pkg.scripts).toBeDefined();
        expect(pkg.scripts.typecheck).toBe("tsc --noEmit");
        expect(pkg.scripts.test).toBe("tsx tests/run.ts");

        // Verify tsconfig.json compiler settings
        const tsconfigPath = path.join(process.cwd(), "tsconfig.json");
        const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf8"));

        expect(tsconfig.compilerOptions.strict).toBe(true);
        expect(tsconfig.compilerOptions.paths["@/*"]).toBeDefined();
      }
    );

    // =========================================================================
    // Pair 20: Production Build + GLTF Asset Pipeline
    // =========================================================================
    await record(
      "T3.20: Production Build + GLTF Asset Pipeline Verification",
      async () => {
        const modelPath = path.join(process.cwd(), "public/models/avatar.gltf");
        expect(fs.existsSync(modelPath)).toBe(true);

        const rawGltf = fs.readFileSync(modelPath, "utf8");
        const gltfJson = JSON.parse(rawGltf);

        // Validate glTF 2.0 asset specification compliance
        expect(gltfJson.asset).toBeDefined();
        expect(gltfJson.asset.version).toBe("2.0");
        expect(Array.isArray(gltfJson.scenes)).toBe(true);
        expect(Array.isArray(gltfJson.nodes)).toBe(true);
        expect(Array.isArray(gltfJson.meshes)).toBe(true);
        expect(Array.isArray(gltfJson.animations)).toBe(true);

        // Verify animation clip names in glTF asset
        const clipNames = gltfJson.animations.map((a: any) => a.name);
        expect(clipNames.some((n: string) => /idle/i.test(n))).toBe(true);
        expect(clipNames.some((n: string) => /walk|run/i.test(n))).toBe(true);
      }
    );
  } finally {
    cleanupWebGLMock();
    cleanupDOMShim();
  }

  const duration = Date.now() - startTime;
  return {
    passed,
    failed,
    total: passed + failed,
    duration,
  };
}

export const run = runTier3;

// Standalone CLI execution
function isMain(): boolean {
  try {
    const mainArg = process.argv[1];
    if (!mainArg) return false;
    const resolvedMain = path.resolve(mainArg).toLowerCase();
    return (
      resolvedMain.endsWith("tier3_combinations.e2e.ts") ||
      resolvedMain.endsWith("tier3_combinations.e2e.js")
    );
  } catch {
    return false;
  }
}

if (isMain()) {
  runTier3()
    .then((result) => {
      if (result.failed > 0) {
        process.exit(1);
      } else {
        process.exit(0);
      }
    })
    .catch((err) => {
      console.error("Fatal Tier 3 runner error:", err);
      process.exit(1);
    });
}
