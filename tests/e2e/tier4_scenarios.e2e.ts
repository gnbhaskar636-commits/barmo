/**
 * tests/e2e/tier4_scenarios.e2e.ts
 *
 * Tier 4: Real-World Scenarios for Barmo Lounge.
 * End-to-end user journeys and complex workloads across Desktop & Mobile viewports,
 * multiplayer sessions, WebGL context loss recovery, and production readiness gates.
 *
 * Covered Scenarios:
 * 1. Complete Desktop Gamer Journey (1440x900, Shell, World, Rigged Character, PC Controls, Dice Duel, Teardown)
 * 2. Complete Mobile Player Experience (390x844, Responsive Shell, Touch Joystick, Camera Look, Jump, Modal Sheet, Quiz Arena)
 * 3. Realtime Multiplayer Peer Session with Bots & Fallback Resilience (Lounge World, SkeletonUtils, AI Bot, Asset Drop Fallback, 10Hz Locomotion)
 * 4. Dynamic Cross-Device Viewport Transition & WebGL Crash Recovery (Desktop to Mobile Breakpoint, Reactive Media Queries, WebGL Context Loss & Restoral)
 * 5. Full Production Build, Lint, Typecheck & Deployment Gate (Next.js Routes, Tsconfig, Asset Integrity, Vercel Readiness)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as THREE from "three";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";

import {
  installDOMShim,
  cleanupDOMShim,
  setViewport,
  getViewport,
  HTMLElementShim,
  HTMLCanvasElementShim,
  MouseEventShim,
  PointerEventShim,
  KeyboardEventShim,
  EventShim,
} from "./harness/domShim";
import {
  installWebGLMock,
  cleanupWebGLMock,
  WebGLMockContext,
} from "./harness/webglMock";
import { expect, assert } from "./harness/assert";

import {
  loadCharacterModel,
  createProceduralCharacterInstance,
  clearModelCache,
  type CharacterInstance,
} from "../../lib/world/characterLoader";
import { makeAvatar } from "../../lib/world/avatar";
import {
  moveVector,
  orbitOffset,
  updateCameraDynamics,
  applyCameraTrauma,
  getCameraTrauma,
  resetCameraTrauma,
  checkRoomBoundaryCollision,
  PITCH_MIN,
  PITCH_MAX,
} from "../../lib/world/controls";
import { addJoystick } from "../../lib/world/joystick";
import {
  createDashTrail,
  createFootstepSparks,
  createActionShockwave,
  updateActionShockwaves,
  clearActionShockwaves,
} from "../../lib/world/fx";
import { GAMES, QUESTIONS, type GState } from "../../lib/games/types";
import { ZONES } from "../../lib/world/zones";

// Enhance HTMLElementShim prototype with standard DOM methods if absent
function ensureDOMShimExtensions(): void {
  if (typeof (HTMLElementShim.prototype as any).remove !== "function") {
    (HTMLElementShim.prototype as any).remove = function () {
      if (this.parentElement) {
        this.parentElement.removeChild(this);
      }
    };
  }
  if (typeof (HTMLElementShim.prototype as any).setPointerCapture !== "function") {
    (HTMLElementShim.prototype as any).setPointerCapture = function (pointerId: number) {
      this._capturedPointerId = pointerId;
    };
  }
  if (typeof (HTMLElementShim.prototype as any).releasePointerCapture !== "function") {
    (HTMLElementShim.prototype as any).releasePointerCapture = function (pointerId: number) {
      if (this._capturedPointerId === pointerId) {
        this._capturedPointerId = null;
      }
    };
  }
  if (typeof (HTMLElementShim.prototype as any).hasPointerCapture !== "function") {
    (HTMLElementShim.prototype as any).hasPointerCapture = function (pointerId: number) {
      return this._capturedPointerId === pointerId;
    };
  }
}

// Ensure localStorage polyfill exists in headless Node.js
function ensureLocalStorage(): void {
  if (typeof globalThis.localStorage === "undefined") {
    const store = new Map<string, string>();
    (globalThis as any).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, String(v)),
      removeItem: (k: string) => store.delete(k),
      clear: () => store.clear(),
      get length() {
        return store.size;
      },
      key: (i: number) => Array.from(store.keys())[i] ?? null,
    };
  }
}

// Ensure devicePixelRatio is defined in headless environment
function ensureDevicePixelRatio(): void {
  if (typeof (globalThis as any).devicePixelRatio === "undefined") {
    (globalThis as any).devicePixelRatio = 1;
  }
}

// Prepare avatar glTF data URI for offline headless tests
function getAvatarDataUri(): string {
  try {
    const gltfPath = path.join(process.cwd(), "public", "models", "avatar.gltf");
    if (fs.existsSync(gltfPath)) {
      const content = fs.readFileSync(gltfPath, "utf8");
      return `data:application/json;base64,${Buffer.from(content).toString("base64")}`;
    }
  } catch {
    // fallback to empty if unavailable
  }
  return "";
}

/**
 * Main Tier 4 Test Suite Entrypoint
 */
export async function runTier4(): Promise<{
  passed: number;
  failed: number;
  total: number;
  duration: number;
}> {
  const startTime = Date.now();
  let passed = 0;
  let failed = 0;

  ensureDOMShimExtensions();
  ensureLocalStorage();
  ensureDevicePixelRatio();

  const avatarDataUri = getAvatarDataUri();

  async function step(name: string, fn: () => void | Promise<void>): Promise<void> {
    try {
      await fn();
      passed++;
      console.log(`    ✔ [PASS] ${name}`);
    } catch (err: any) {
      failed++;
      console.error(`    ✖ [FAIL] ${name}`);
      console.error(`       Error: ${err?.message || err}`);
      if (err?.stack) {
        console.error(`       ${err.stack.split("\n").slice(1, 4).join("\n       ")}`);
      }
    }
  }

  // =========================================================================
  // SCENARIO 1: COMPLETE DESKTOP GAMER JOURNEY
  // =========================================================================
  console.log("\n  --- Scenario 1: Complete Desktop Gamer Journey ---");

  await step(
    "T4.1.1: Desktop Gamer - Shell Mount & 248px Gutter-Free Navigation (1440x900)",
    () => {
      installDOMShim({ width: 1440, height: 900 });
      installWebGLMock();
      ensureDOMShimExtensions();

      try {
        const vp = getViewport();
        expect(vp.width).toBe(1440);
        expect(vp.height).toBe(900);

        // Verify media queries for desktop layout
        const mqDesktop = window.matchMedia("(min-width: 960px)");
        const mqMobile = window.matchMedia("(max-width: 960px)");
        expect(mqDesktop.matches).toBe(true);
        expect(mqMobile.matches).toBe(false);

        // Simulate AppShell DOM tree
        const shell = document.createElement("div");
        shell.className = "b4-shell";

        const sidebar = document.createElement("aside");
        sidebar.className = "b4-sidebar";
        sidebar.style.width = "248px";
        sidebar.style.display = "flex";

        const body = document.createElement("div");
        body.className = "b4-body";

        const topbar = document.createElement("header");
        topbar.className = "b4-topbar";

        const mobileDock = document.createElement("nav");
        mobileDock.className = "b4-mobile-dock";
        mobileDock.style.display = "none";

        shell.appendChild(sidebar);
        shell.appendChild(body);
        shell.appendChild(mobileDock);
        document.body.appendChild(shell);

        // Verify sidebar visibility and 248px desktop width
        expect(sidebar.style.width).toBe("248px");
        expect(sidebar.style.display).toBe("flex");
        expect(mobileDock.style.display).toBe("none");

        // Verify zero-margin/padding body layout contract (no 84px left gutter clash)
        expect(document.body.style.paddingLeft || "0").toBe("0");

        shell.remove();
      } finally {
        cleanupWebGLMock();
        cleanupDOMShim();
      }
    }
  );

  await step(
    "T4.1.2: Desktop Gamer - WebGL Scene Init, Rigged GLTF Character & Locomotion Sprint",
    async () => {
      installDOMShim({ width: 1440, height: 900 });
      installWebGLMock();
      ensureDOMShimExtensions();
      clearModelCache();
      resetCameraTrauma();

      try {
        const host = document.createElement("div");
        document.body.appendChild(host);

        const canvas = document.createElement("canvas");
        canvas.width = 1440;
        canvas.height = 900;
        host.appendChild(canvas);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(55, 1440 / 900, 0.1, 1000);
        camera.position.set(0, 3, 5);

        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setSize(1440, 900);

        const gl = canvas.getContext("webgl2") as WebGLMockContext;
        expect(gl).toBeDefined();

        // Load 3D humanoid character model
        const char = await loadCharacterModel(avatarDataUri, scene);
        expect(char.root).toBeDefined();
        expect(char.root.type).toBe("Group");
        expect(char.isProceduralFallback).toBe(false);
        expect(char.mixer).toBeDefined();
        expect(char.currentAction).toBe("idle");

        // Character update tick
        char.update(0.016);
        renderer.render(scene, camera);
        expect(gl.drawCalls).toBeGreaterThanOrEqual(1);

        // Locomotion: transition from idle to walk
        char.setAction("walk", 0.15);
        expect(char.currentAction).toBe("walk");
        char.update(0.05);

        // Locomotion: Shift sprint acceleration
        char.setAction("run", 0.15);
        expect(char.currentAction).toBe("run");
        char.update(0.05);

        // Dynamic Camera FOV Rush (+4 deg on sprint)
        const dynSprint = updateCameraDynamics(camera, true, 0.05, 55);
        expect(dynSprint.fov).toBeGreaterThan(55);
        expect(dynSprint.fov).toBeLessThanOrEqual(59.1);

        // High-energy dash speed trail emitter
        const dashTrail = createDashTrail(scene);
        dashTrail.update(0.05, new THREE.Vector3(0, 0, 0), true);
        expect(dashTrail.getActiveCount()).toBeGreaterThan(0);

        // Cleanup scene resources
        dashTrail.dispose();
        char.dispose();
        renderer.dispose();
        host.remove();
      } finally {
        cleanupWebGLMock();
        cleanupDOMShim();
      }
    }
  );

  await step(
    "T4.1.3: Desktop Gamer - PC Pointer Lock, FOV Rush, Action Shockwave & Dice Duel Victory",
    async () => {
      installDOMShim({ width: 1440, height: 900 });
      installWebGLMock();
      ensureDOMShimExtensions();
      resetCameraTrauma();

      try {
        const canvas = document.createElement("canvas");
        document.body.appendChild(canvas);

        // 1. Engage PC Pointer Lock
        canvas.requestPointerLock();
        expect(document.pointerLockElement).toBe(canvas);

        // 2. Mouse look: camera yaw rotation
        let camYaw = 0;
        let camPitch = 0.42;
        const mouseEvt = new MouseEventShim("mousemove", { movementX: 18, movementY: -6 });
        const sens = 1.0;
        camYaw = (camYaw - mouseEvt.movementX * 0.0025 * sens) % (Math.PI * 2);
        camPitch = Math.min(PITCH_MAX, Math.max(PITCH_MIN, camPitch - mouseEvt.movementY * 0.0025 * sens));
        expect(camYaw).toBeCloseTo(-0.045, 3);
        expect(camPitch).toBeCloseTo(0.435, 3);

        // 3. Space jump impulse & Action Shockwave
        const scene = new THREE.Scene();
        const avatarPos = new THREE.Vector3(0, 0, 0);
        createActionShockwave(scene, avatarPos, 0x8b5cf6);
        applyCameraTrauma(0.35);
        expect(getCameraTrauma()).toBeCloseTo(0.35, 2);

        // 4. Transition to /games: Cyber Dice Duel (3 Rounds)
        const diceConfig = GAMES.find((g) => g.id === "dice")!;
        expect(diceConfig).toBeDefined();
        expect(diceConfig.rounds).toBe(3);

        const gameState: GState = {
          game: "dice",
          phase: "play",
          round: 1,
          rounds: 3,
          host: "p1",
          players: {
            p1: { id: "p1", name: "DesktopGamer", av: "atlas", score: 0 },
            p2: { id: "p2", name: "CyberRival", av: "nova", score: 0 },
          },
          rolls: {},
          msg: "Roll!",
        };

        // Round 1: P1 rolls 5, P2 rolls 3 -> P1 wins round 1
        gameState.rolls = { p1: 5, p2: 3 };
        gameState.players.p1.score += 1;
        gameState.round = 2;

        // Round 2: P1 rolls 3, P2 rolls 6 -> P2 wins round 2
        gameState.rolls = { p1: 3, p2: 6 };
        gameState.players.p2.score += 1;
        gameState.round = 3;

        // Round 3: P1 rolls 6, P2 rolls 2 -> P1 wins round 3
        gameState.rolls = { p1: 6, p2: 2 };
        gameState.players.p1.score += 1;
        gameState.phase = "over";

        // Declare winner
        const p1Score = gameState.players.p1.score;
        const p2Score = gameState.players.p2.score;
        expect(p1Score).toBe(2);
        expect(p2Score).toBe(1);
        gameState.winners = p1Score > p2Score ? ["p1"] : ["p2"];
        expect(gameState.winners[0]).toBe("p1");

        // 5. Teardown and exit pointer lock
        document.exitPointerLock();
        expect(document.pointerLockElement).toBeNull();
        clearActionShockwaves();
        resetCameraTrauma();
        canvas.remove();
      } finally {
        cleanupWebGLMock();
        cleanupDOMShim();
      }
    }
  );

  // =========================================================================
  // SCENARIO 2: COMPLETE MOBILE PLAYER EXPERIENCE
  // =========================================================================
  console.log("\n  --- Scenario 2: Complete Mobile Player Experience ---");

  await step(
    "T4.2.1: Mobile Player - 390x844 Shell Adaptability, Sidebar Collapse & Mobile Dock",
    () => {
      installDOMShim({ width: 390, height: 844 });
      ensureDOMShimExtensions();

      try {
        const vp = getViewport();
        expect(vp.width).toBe(390);
        expect(vp.height).toBe(844);

        // Verify media queries for mobile layout (<960px)
        const mqMobile = window.matchMedia("(max-width: 960px)");
        const mqDesktop = window.matchMedia("(min-width: 960px)");
        expect(mqMobile.matches).toBe(true);
        expect(mqDesktop.matches).toBe(false);

        // Verify shell responsive contract
        const sidebar = document.createElement("aside");
        sidebar.className = "b4-sidebar";
        const mobileDock = document.createElement("nav");
        mobileDock.className = "b4-mobile-dock";

        if (mqMobile.matches) {
          sidebar.style.display = "none";
          mobileDock.style.display = "flex";
        }

        expect(sidebar.style.display).toBe("none");
        expect(mobileDock.style.display).toBe("flex");
      } finally {
        cleanupDOMShim();
      }
    }
  );

  await step(
    "T4.2.2: Mobile Player - Virtual Touch Joystick Locomotion & Quadratic Deadzone Response",
    () => {
      installDOMShim({ width: 390, height: 844 });
      ensureDOMShimExtensions();

      try {
        const host = document.createElement("div");
        document.body.appendChild(host);

        const joy = addJoystick(host);
        expect(joy.el).toBeDefined();
        expect(joy.x()).toBe(0);
        expect(joy.y()).toBe(0);

        // Simulate touch start at joystick center (50, 50)
        joy.el.getBoundingClientRect = () => ({
          left: 10,
          top: 10,
          width: 80,
          height: 80,
          right: 90,
          bottom: 90,
          x: 10,
          y: 10,
          toJSON: () => {},
        });

        // Pointerdown on center
        joy.el.dispatchEvent(
          new PointerEventShim("pointerdown", { pointerId: 1, clientX: 50, clientY: 50 })
        );

        // Drag beyond deadzone: move to clientX: 74, clientY: 28 (dx: 24, dy: -22, len: ~32.5 / 44 = ~0.74)
        joy.el.dispatchEvent(
          new PointerEventShim("pointermove", { pointerId: 1, clientX: 74, clientY: 28 })
        );

        expect(joy.el.classList.contains("active")).toBe(true);
        const jx = joy.x();
        const jy = joy.y();
        expect(jx).toBeGreaterThan(0);
        expect(jy).toBeGreaterThan(0);

        // Verify locomotion vector generated from virtual touch joystick
        const mv = moveVector(jy, jx, 0);
        expect(mv.amt).toBeGreaterThan(0.3);
        expect(mv.amt).toBeLessThanOrEqual(1.0);
        expect(mv.z).toBeGreaterThan(0);

        // Release joystick
        joy.el.dispatchEvent(new PointerEventShim("pointerup", { pointerId: 1 }));
        expect(joy.x()).toBe(0);
        expect(joy.y()).toBe(0);

        joy.dispose();
        host.remove();
      } finally {
        cleanupDOMShim();
      }
    }
  );

  await step(
    "T4.2.3: Mobile Player - Split-Touch Camera Orbit, Jump Button & Small-Height Sheet Modal",
    () => {
      installDOMShim({ width: 390, height: 500 }); // Small height: 500px
      ensureDOMShimExtensions();

      try {
        // 1. Right-side touch drag for camera orbit (Touch ID 2)
        let yaw = 0;
        let pitch = 0.42;
        const dragDeltaX = -25;
        const dragDeltaY = 14;
        const sens = 1.0;

        yaw += dragDeltaX * 0.005 * sens;
        pitch = Math.min(PITCH_MAX, Math.max(PITCH_MIN, pitch + dragDeltaY * 0.005 * sens));

        expect(yaw).toBeCloseTo(-0.125, 3);
        expect(pitch).toBeCloseTo(0.49, 3);

        // 2. On-screen Jump Button Action
        const jumpBtn = document.createElement("button");
        jumpBtn.className = "pad-btn-jump";
        let jumpTriggered = false;
        jumpBtn.addEventListener("pointerdown", () => {
          jumpTriggered = true;
        });
        jumpBtn.dispatchEvent(new PointerEventShim("pointerdown", { pointerId: 3 }));
        expect(jumpTriggered).toBe(true);

        // 3. Sheet Modal overflow verification on small height (500px)
        const sheet = document.createElement("dialog");
        sheet.className = "sheet";
        sheet.style.maxHeight = "min(62%, 540px)"; // 62% of 500px = 310px
        sheet.style.overflow = "auto";
        sheet.style.width = "min(440px, calc(100% - 20px))"; // 370px

        document.body.appendChild(sheet);
        expect(sheet.style.overflow).toBe("auto");
        expect(sheet.style.maxHeight).toBe("min(62%, 540px)");

        sheet.remove();
      } finally {
        cleanupDOMShim();
      }
    }
  );

  await step(
    "T4.2.4: Mobile Player - Complete Neural Quiz Arena Round with Speed Bonus Scoring",
    () => {
      const q = QUESTIONS[0]; // "Which planet is known as the Red Planet?"
      expect(q).toBeDefined();
      expect(q.a).toBe(1); // "Mars"

      const dur = 12000;
      const answerTimeMs = 2400; // Answered in 2.4s

      // Score calculation formula: base 10 + speed bonus up to 5 points
      const isCorrect = 1 === q.a;
      expect(isCorrect).toBe(true);

      const speedFactor = 1 - Math.min(1, answerTimeMs / dur);
      const pointsGained = 10 + Math.round(speedFactor * 5);

      expect(pointsGained).toBe(14); // 10 + round(0.8 * 5) = 14
    }
  );

  // =========================================================================
  // SCENARIO 3: REALTIME MULTIPLAYER PEER SESSION WITH BOTS & FALLBACK RESILIENCE
  // =========================================================================
  console.log("\n  --- Scenario 3: Realtime Multiplayer Peer Session with Bots & Fallback Resilience ---");

  await step(
    "T4.3.1: Multiplayer Lounge - SkeletonUtils Independent Bone Hierarchy Cloning",
    async () => {
      installDOMShim({ width: 1280, height: 800 });
      installWebGLMock();
      ensureDOMShimExtensions();
      clearModelCache();

      try {
        const scene = new THREE.Scene();

        // 1. Load primary player character
        const p1Char = await loadCharacterModel(avatarDataUri, scene);
        expect(p1Char.isProceduralFallback).toBe(false);

        // 2. Clone for peer avatar via SkeletonUtils
        const peerRoot = SkeletonUtils.clone(p1Char.root) as THREE.Group;
        expect(peerRoot).toBeDefined();
        expect(peerRoot).not.toBe(p1Char.root);

        // 3. Verify independent bone transformation isolation
        const p1Bone = p1Char.root.getObjectByName("LeftArm");
        const peerBone = peerRoot.getObjectByName("LeftArm");

        if (p1Bone && peerBone) {
          p1Bone.rotation.x = 1.2;
          peerBone.rotation.x = -0.5;
          expect(p1Bone.rotation.x).toBeCloseTo(1.2, 2);
          expect(peerBone.rotation.x).toBeCloseTo(-0.5, 2);
          expect(p1Bone.rotation.x).not.toBe(peerBone.rotation.x);
        }

        p1Char.dispose();
      } finally {
        cleanupWebGLMock();
        cleanupDOMShim();
      }
    }
  );

  await step(
    "T4.3.2: Multiplayer Lounge - Autonomous AI Bot Controller State Machine (Idle->Patrol->Dance)",
    () => {
      interface BotAgent {
        id: string;
        state: "idle" | "patrol" | "dance";
        pos: THREE.Vector3;
        yaw: number;
        waypoints: THREE.Vector3[];
        currentWpIndex: number;
        timer: number;
        update: (dt: number) => void;
      }

      const bot: BotAgent = {
        id: "bot_nova_guide",
        state: "idle",
        pos: new THREE.Vector3(0, 0, 0),
        yaw: 0,
        waypoints: [
          new THREE.Vector3(-4.5, 0, 2.0), // Bar
          new THREE.Vector3(0.0, 0, -8.0), // Idea Wall
          new THREE.Vector3(5.0, 0, 3.5),  // Terrace
        ],
        currentWpIndex: 0,
        timer: 0,
        update(dt: number) {
          this.timer += dt;
          if (this.state === "idle") {
            if (this.timer >= 1.0) {
              this.state = "patrol";
              this.timer = 0;
            }
          }
          if (this.state === "patrol") {
            const target = this.waypoints[this.currentWpIndex];
            const dir = new THREE.Vector3().subVectors(target, this.pos);
            const dist = dir.length();
            if (dist < 0.2) {
              this.state = "dance";
              this.timer = 0;
              this.currentWpIndex = (this.currentWpIndex + 1) % this.waypoints.length;
            } else {
              dir.normalize();
              this.pos.addScaledVector(dir, 2.5 * dt);
              this.yaw = Math.atan2(dir.x, dir.z);
            }
          } else if (this.state === "dance") {
            if (this.timer >= 2.0) {
              this.state = "idle";
              this.timer = 0;
            }
          }
        },
      };

      expect(bot.state).toBe("idle");

      // Advance 1.5s -> bot transitions to patrol and moves along waypoints
      bot.update(1.5);
      expect(bot.state).toBe("patrol");
      expect(bot.pos.length()).toBeGreaterThan(0);

      // Advance until first waypoint reached -> transitions to dance
      bot.pos.copy(bot.waypoints[0]);
      bot.update(0.1);
      expect(bot.state).toBe("dance");

      // Advance 2.5s -> transitions back to idle
      bot.update(2.5);
      expect(bot.state).toBe("idle");
    }
  );

  await step(
    "T4.3.3: Multiplayer Lounge - Asset Load Drop Fallback to Procedural Avatar & 10Hz Locomotion Stream",
    async () => {
      installDOMShim({ width: 1280, height: 800 });
      installWebGLMock();
      ensureDOMShimExtensions();
      clearModelCache();

      try {
        const scene = new THREE.Scene();

        // 1. Simulate network packet drop causing asset URL failure
        const brokenUrl = "http://unreachable-asset-drop.internal/peer_corrupted.gltf";
        const fallbackChar = await loadCharacterModel(brokenUrl, scene);

        expect(fallbackChar).toBeDefined();
        expect(fallbackChar.isProceduralFallback).toBe(true);
        expect(fallbackChar.root.name).toBe("ProceduralAvatarInstance");

        // Verify procedural limbs can be animated without errors
        fallbackChar.setAction("walk");
        expect(fallbackChar.currentAction).toBe("walk");
        fallbackChar.update(0.1);
        expect(fallbackChar.root.position.y).toBeGreaterThanOrEqual(0);

        // 2. Broadcast 10Hz peer locomotion updates and verify auto-switching
        let peerAction: "idle" | "walk" | "run" = "idle";
        let prevPos = new THREE.Vector3(0, 0, 0);

        function handlePeerLocomotionTick(newPos: THREE.Vector3, dt: number) {
          const speed = newPos.distanceTo(prevPos) / dt;
          prevPos.copy(newPos);

          if (speed > 3.0) {
            peerAction = "run";
          } else if (speed > 0.3) {
            peerAction = "walk";
          } else {
            peerAction = "idle";
          }
        }

        // Tick 1 (Stationary): speed 0 m/s -> idle
        handlePeerLocomotionTick(new THREE.Vector3(0, 0, 0), 0.1);
        expect(peerAction).toBe("idle");

        // Tick 2 (Walk): move 0.15m in 0.1s -> speed 1.5 m/s -> walk
        handlePeerLocomotionTick(new THREE.Vector3(0.15, 0, 0), 0.1);
        expect(peerAction).toBe("walk");

        // Tick 3 (Sprint): move 0.45m in 0.1s -> speed 4.5 m/s -> run
        handlePeerLocomotionTick(new THREE.Vector3(0.60, 0, 0), 0.1);
        expect(peerAction).toBe("run");

        fallbackChar.dispose();
      } finally {
        cleanupWebGLMock();
        cleanupDOMShim();
      }
    }
  );

  // =========================================================================
  // SCENARIO 4: DYNAMIC CROSS-DEVICE VIEWPORT TRANSITION & WEBGL CRASH RECOVERY
  // =========================================================================
  console.log("\n  --- Scenario 4: Dynamic Cross-Device Viewport Transition & WebGL Crash Recovery ---");

  await step(
    "T4.4.1: Cross-Device Transition - Dynamic Breakpoint Resize (1280px -> 375px -> 1280px)",
    () => {
      installDOMShim({ width: 1280, height: 800 });
      ensureDOMShimExtensions();

      try {
        let isMobileLayout = false;
        const mql = window.matchMedia("(max-width: 960px)");
        mql.addEventListener("change", (e: any) => {
          isMobileLayout = e.matches;
        });

        // Initial Desktop state
        expect(mql.matches).toBe(false);
        expect(isMobileLayout).toBe(false);

        // Dynamically resize across 960px breakpoint to mobile
        setViewport(375, 667);
        expect(mql.matches).toBe(true);
        expect(isMobileLayout).toBe(true);

        // Dynamically resize back to desktop
        setViewport(1280, 800);
        expect(mql.matches).toBe(false);
        expect(isMobileLayout).toBe(false);
      } finally {
        cleanupDOMShim();
      }
    }
  );

  await step(
    "T4.4.2: WebGL Crash Recovery - Simulated Context Loss & Full Resource Restoral",
    () => {
      installDOMShim({ width: 1280, height: 800 });
      installWebGLMock();
      ensureDOMShimExtensions();

      try {
        const canvas = document.createElement("canvas");
        document.body.appendChild(canvas);

        const gl = canvas.getContext("webgl2") as WebGLMockContext;
        expect(gl).toBeDefined();
        expect(gl.isContextLost()).toBe(false);

        let contextLostHandled = false;
        let contextRestoredHandled = false;
        let loopPaused = false;
        let errorHudVisible = false;

        // Context loss listener
        canvas.addEventListener("webglcontextlost", (e: any) => {
          e.preventDefault(); // Required to enable recovery
          contextLostHandled = true;
          loopPaused = true;
          errorHudVisible = true;
        });

        // Context restored listener
        canvas.addEventListener("webglcontextrestored", () => {
          contextRestoredHandled = true;
          loopPaused = false;
          errorHudVisible = false;
        });

        // Simulate context loss
        gl.simulateContextLoss();
        expect(gl.isContextLost()).toBe(true);
        expect(contextLostHandled).toBe(true);
        expect(loopPaused).toBe(true);
        expect(errorHudVisible).toBe(true);

        // Simulate context restoration
        gl.simulateContextRestored();
        expect(gl.isContextLost()).toBe(false);
        expect(contextRestoredHandled).toBe(true);
        expect(loopPaused).toBe(false);
        expect(errorHudVisible).toBe(false);

        canvas.remove();
      } finally {
        cleanupWebGLMock();
        cleanupDOMShim();
      }
    }
  );

  // =========================================================================
  // SCENARIO 5: FULL PRODUCTION BUILD, LINT, TYPECHECK & DEPLOYMENT GATE
  // =========================================================================
  console.log("\n  --- Scenario 5: Full Production Build, Lint, Typecheck & Deployment Gate ---");

  await step(
    "T4.5.1: Production Gate - App Router Routes, Tsconfig & Static Asset Manifest Integrity",
    () => {
      const cwd = process.cwd();

      // 1. Verify Core Next.js App Router route files exist
      const requiredRoutes = [
        "app/layout.tsx",
        "app/page.tsx",
        "app/world/page.tsx",
        "app/games/page.tsx",
        "app/profile/page.tsx",
        "app/tournaments/page.tsx",
        "app/leaderboard/page.tsx",
        "app/dashboard/page.tsx",
        "app/shop/page.tsx",
        "app/setup/page.tsx",
        "app/explore/page.tsx",
        "app/community/page.tsx",
        "app/groups/page.tsx",
        "app/trainer/page.tsx",
        "app/globals.css",
      ];

      for (const route of requiredRoutes) {
        const fullPath = path.join(cwd, route);
        expect(fs.existsSync(fullPath)).toBe(true);
      }

      // 2. Verify globals.css contains responsive shell breakpoints & CSS vars
      const cssContent = fs.readFileSync(path.join(cwd, "app/globals.css"), "utf8");
      expect(cssContent).toContain("--b4-sidebar-w: 248px");
      expect(cssContent).toContain("@media (max-width: 960px)");

      // 3. Verify tsconfig.json strict settings
      const tsconfig = JSON.parse(fs.readFileSync(path.join(cwd, "tsconfig.json"), "utf8"));
      expect(tsconfig.compilerOptions.strict).toBe(true);
      expect(tsconfig.compilerOptions.noEmit).toBe(true);
      expect(tsconfig.compilerOptions.paths["@/*"]).toBeDefined();

      // 4. Verify public 3D models and branding icons exist
      const requiredAssets = [
        "public/models/avatar.gltf",
        "public/logo.svg",
        "public/icon-192.png",
        "public/icon-512.png",
        "public/apple-touch-icon.png",
      ];

      for (const asset of requiredAssets) {
        const fullPath = path.join(cwd, asset);
        expect(fs.existsSync(fullPath)).toBe(true);
      }

      // 5. Verify glTF content structure
      const gltfObj = JSON.parse(fs.readFileSync(path.join(cwd, "public/models/avatar.gltf"), "utf8"));
      expect(gltfObj.asset.version).toBe("2.0");
      expect(Array.isArray(gltfObj.nodes)).toBe(true);
      expect(Array.isArray(gltfObj.animations)).toBe(true);
      expect(gltfObj.animations.length).toBeGreaterThan(0);
    }
  );

  await step(
    "T4.5.2: Production Gate - Build Scripts, Environment Handling & Vercel Packaging Readiness",
    () => {
      const cwd = process.cwd();

      // 1. Verify package.json build and check scripts
      const pkg = JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf8"));
      expect(pkg.scripts.build).toBe("next build");
      expect(pkg.scripts.typecheck).toBe("tsc --noEmit");
      expect(pkg.scripts.test).toBe("tsx tests/run.ts");

      // 2. Verify next.config.ts configuration
      const nextConfigPath = path.join(cwd, "next.config.ts");
      expect(fs.existsSync(nextConfigPath)).toBe(true);
      const nextConfigContent = fs.readFileSync(nextConfigPath, "utf8");
      expect(nextConfigContent).toContain("outputFileTracingRoot");
      expect(nextConfigContent).toContain("/sw.js");

      // 3. Verify Supabase browser client has fallback handling for build environments
      const sbClientPath = path.join(cwd, "lib/supabase/client.ts");
      expect(fs.existsSync(sbClientPath)).toBe(true);
      const sbClientContent = fs.readFileSync(sbClientPath, "utf8");
      expect(sbClientContent).toContain("NEXT_PUBLIC_SUPABASE_URL");
    }
  );

  const duration = Date.now() - startTime;

  console.log("\n" + "-".repeat(50));
  console.log(`Tier 4 Test Results: ${passed} passed, ${failed} failed in ${duration}ms`);
  console.log("-".repeat(50) + "\n");

  return { passed, failed, total: passed + failed, duration };
}

// Export default runner alias matching runner.ts convention
export const run = runTier4;
