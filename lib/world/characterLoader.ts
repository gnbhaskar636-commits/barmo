import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import { makeAvatar, type AvatarConfig } from "@/lib/world/avatar";

// Polyfill ProgressEvent in Node.js test environments if absent
if (typeof globalThis.ProgressEvent === "undefined") {
  (globalThis as unknown as { ProgressEvent: unknown }).ProgressEvent = class ProgressEvent extends Event {
    constructor(type: string, dict?: EventInit) {
      super(type);
      if (dict) Object.assign(this, dict);
    }
  };
}

export type AnimationState = "idle" | "walk" | "run" | "action" | "jump";

export interface CharacterInstance {
  root: THREE.Group;
  mixer: THREE.AnimationMixer | null;
  actions: Record<string, THREE.AnimationAction>;
  currentAction: AnimationState;
  setAction: (name: AnimationState, fadeDuration?: number) => void;
  update: (dt: number) => void;
  dispose: () => void;
  isProceduralFallback: boolean;
}

const modelCache = new Map<string, GLTF>();
const pendingLoads = new Map<string, Promise<GLTF>>();

/** Clears the in-memory glTF model cache (useful for testing). */
export function clearModelCache(): void {
  modelCache.clear();
  pendingLoads.clear();
}

/** Returns the number of cached glTF models. */
export function getCachedModelCount(): number {
  return modelCache.size;
}

/**
 * Normalizes clip name to standard AnimationState using regex matching:
 * /idle/i -> "idle", /walk/i -> "walk", /run/i -> "run",
 * /action|dance/i -> "action", /jump/i -> "jump".
 */
export function normalizeClipName(name: string): AnimationState | null {
  if (/idle/i.test(name)) return "idle";
  if (/run|sprint|dash/i.test(name)) return "run";
  if (/walk/i.test(name)) return "walk";
  if (/action|dance|emote|wave|clap/i.test(name)) return "action";
  if (/jump|leap/i.test(name)) return "jump";
  return null;
}

/**
 * Creates a procedural fallback CharacterInstance wrapping makeAvatar().
 * Animates procedural limbs according to currentAction when update(dt) is called.
 */
export function createProceduralCharacterInstance(
  config?: Partial<AvatarConfig> | string,
  scene?: THREE.Scene
): CharacterInstance {
  const root = makeAvatar(config || "atlas");
  root.name = "ProceduralAvatarInstance";

  if (scene) {
    scene.add(root);
  }

  let currentAction: AnimationState = "idle";
  let animTime = 0;

  const legs = (root.userData.legs as THREE.Group[]) || [];
  const arms = (root.userData.arms as THREE.Group[]) || [];

  const update = (dt: number) => {
    animTime += dt;
    if (legs.length < 2 || arms.length < 2) return;

    if (currentAction === "idle") {
      legs[0].rotation.x = 0;
      legs[1].rotation.x = 0;
      const breath = Math.sin(animTime * 2.2) * 0.02;
      arms[0].rotation.set(0, 0, 0.05 + breath);
      arms[1].rotation.set(0, 0, -(0.05 + breath));
      root.position.y = Math.sin(animTime * 2.2) * 0.012;
      root.rotation.z = 0;
    } else if (currentAction === "walk") {
      const sw = Math.sin(animTime * 6.5) * 0.65;
      legs[0].rotation.x = sw;
      legs[1].rotation.x = -sw;
      arms[0].rotation.set(-sw * 0.75, 0, 0);
      arms[1].rotation.set(sw * 0.75, 0, 0);
      root.position.y = Math.abs(Math.sin(animTime * 6.5)) * 0.04;
      root.rotation.z = 0;
    } else if (currentAction === "run") {
      const sw = Math.sin(animTime * 11) * 1.05;
      legs[0].rotation.x = sw;
      legs[1].rotation.x = -sw;
      arms[0].rotation.set(-sw * 0.9, 0, 0);
      arms[1].rotation.set(sw * 0.9, 0, 0);
      root.position.y = Math.abs(Math.sin(animTime * 11)) * 0.08;
      root.rotation.z = 0;
    } else if (currentAction === "action") {
      const bob = Math.abs(Math.sin(animTime * 7)) * 0.12;
      arms[0].rotation.set(0, 0, -(2.2 + Math.sin(animTime * 7) * 0.35));
      arms[1].rotation.set(0, 0, 2.2 + Math.sin(animTime * 7 + 1) * 0.35);
      root.rotation.z = Math.sin(animTime * 3.5) * 0.08;
      root.position.y = bob;
    } else if (currentAction === "jump") {
      arms[0].rotation.set(0, 0, -2.1);
      arms[1].rotation.set(0, 0, 2.1);
      legs[0].rotation.x = 0.25;
      legs[1].rotation.x = 0.25;
      root.position.y = 0.35;
      root.rotation.z = 0;
    }
  };

  const dispose = () => {
    if (scene) {
      scene.remove(root);
    }
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    });
  };

  return {
    root,
    mixer: null,
    actions: {},
    get currentAction() {
      return currentAction;
    },
    set currentAction(val: AnimationState) {
      currentAction = val;
    },
    setAction(name: AnimationState) {
      currentAction = name;
    },
    update,
    dispose,
    isProceduralFallback: true,
  };
}

/**
 * Creates a CharacterInstance from a loaded glTF object, using SkeletonUtils.clone
 * so bone hierarchies and AnimationMixer instances are strictly isolated per avatar.
 */
function createCharacterInstanceFromGltf(
  gltf: GLTF,
  scene?: THREE.Scene
): CharacterInstance {
  const root = new THREE.Group();
  root.name = "GLTFCharacterInstanceRoot";

  // Use SkeletonUtils.clone to clone SkinnedMesh and bones independently
  const clonedScene = SkeletonUtils.clone(gltf.scene) as THREE.Group;
  root.add(clonedScene);

  if (scene) {
    scene.add(root);
  }

  const mixer = new THREE.AnimationMixer(clonedScene);
  const actions: Record<string, THREE.AnimationAction> = {};

  // Register and normalize animation clips
  const rawClips = gltf.animations || [];
  for (const clip of rawClips) {
    const action = mixer.clipAction(clip, clonedScene);
    actions[clip.name] = action;

    const normalized = normalizeClipName(clip.name);
    if (normalized && !actions[normalized]) {
      actions[normalized] = action;
    }
  }

  // Ensure standard locomotion states exist or map fallbacks
  if (!actions.idle && rawClips.length > 0) {
    actions.idle = mixer.clipAction(rawClips[0], clonedScene);
  }
  if (!actions.walk && actions.run) {
    actions.walk = actions.run;
  }
  if (!actions.run && actions.walk) {
    actions.run = actions.walk;
  }
  if (!actions.action && (actions.dance || actions.idle)) {
    actions.action = actions.dance || actions.idle;
  }
  if (!actions.jump && (actions.action || actions.idle)) {
    actions.jump = actions.action || actions.idle;
  }

  let currentAction: AnimationState = "idle";
  if (actions.idle) {
    actions.idle.play();
  }

  const setAction = (name: AnimationState, fadeDuration = 0.2) => {
    if (name === currentAction) return;

    const prevAction = actions[currentAction];
    const nextAction = actions[name];

    if (nextAction) {
      if (prevAction && prevAction !== nextAction) {
        prevAction.fadeOut(fadeDuration);
      }
      nextAction.reset().fadeIn(fadeDuration).play();
      currentAction = name;
    } else {
      currentAction = name;
    }
  };

  const update = (dt: number) => {
    mixer.update(dt);
  };

  const dispose = () => {
    mixer.stopAllAction();
    mixer.uncacheRoot(clonedScene);
    if (scene) {
      scene.remove(root);
    }
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    });
  };

  return {
    root,
    mixer,
    actions,
    get currentAction() {
      return currentAction;
    },
    set currentAction(val: AnimationState) {
      currentAction = val;
    },
    setAction,
    update,
    dispose,
    isProceduralFallback: false,
  };
}

/**
 * Loads a glTF character from URL with in-memory caching and SkeletonUtils cloning.
 * Gracefully falls back to procedural avatar if glTF loading fails, times out (>3.5s),
 * or the URL is empty.
 */
export async function loadCharacterModel(
  url: string,
  scene?: THREE.Scene,
  config?: Partial<AvatarConfig> | string
): Promise<CharacterInstance> {
  const cleanUrl = (url || "").trim();
  if (!cleanUrl) {
    return createProceduralCharacterInstance(config, scene);
  }

  // Cache hit: instantiate new clone immediately
  const cachedGltf = modelCache.get(cleanUrl);
  if (cachedGltf) {
    return createCharacterInstanceFromGltf(cachedGltf, scene);
  }

  // Reuse in-flight promise if same URL requested concurrently
  let loadPromise = pendingLoads.get(cleanUrl);
  if (!loadPromise) {
    const loader = new GLTFLoader();

    // 3.5s timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`glTF loading timed out (>3.5s) for ${cleanUrl}`)), 3500);
    });

    // Actual fetch/parse promise
    const fetchPromise = new Promise<GLTF>(async (resolve, reject) => {
      try {
        // Node.js test environment support for local files
        if (typeof window === "undefined" && !cleanUrl.startsWith("http") && !cleanUrl.startsWith("data:")) {
          try {
            const fs = await import("node:fs/promises");
            const path = await import("node:path");
            const resolvedPath = path.isAbsolute(cleanUrl)
              ? cleanUrl
              : path.join(process.cwd(), cleanUrl.replace(/^\//, ""));
            const content = await fs.readFile(resolvedPath, "utf8");
            loader.parse(
              content,
              "",
              (gltf) => resolve(gltf),
              (err) => reject(err)
            );
            return;
          } catch (fileErr) {
            reject(fileErr);
            return;
          }
        }

        // Standard browser fetch or data URI
        loader.load(
          cleanUrl,
          (gltf) => resolve(gltf),
          undefined,
          (err) => reject(err)
        );
      } catch (err) {
        reject(err);
      }
    });

    loadPromise = Promise.race([fetchPromise, timeoutPromise])
      .then((gltf) => {
        modelCache.set(cleanUrl, gltf);
        pendingLoads.delete(cleanUrl);
        return gltf;
      })
      .catch((err) => {
        pendingLoads.delete(cleanUrl);
        throw err;
      });

    pendingLoads.set(cleanUrl, loadPromise);
  }

  try {
    const gltf = await loadPromise;
    return createCharacterInstanceFromGltf(gltf, scene);
  } catch (err) {
    // Graceful fallback to procedural avatar
    return createProceduralCharacterInstance(config, scene);
  }
}
