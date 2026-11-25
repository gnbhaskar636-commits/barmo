import * as THREE from "three";
import { check, near, section } from "./_t";
import {
  loadCharacterModel,
  normalizeClipName,
  clearModelCache,
  getCachedModelCount,
  createProceduralCharacterInstance,
} from "@/lib/world/characterLoader";
import {
  createDashTrail,
  createFootstepSparks,
  createActionShockwave,
  updateActionShockwaves,
  clearActionShockwaves,
} from "@/lib/world/fx";
import {
  applyCameraTrauma,
  getCameraTrauma,
  resetCameraTrauma,
  updateCameraDynamics,
  checkRoomBoundaryCollision,
  type RoomBounds,
} from "@/lib/world/controls";

export async function run() {
  section("characterLoader: animation clip name normalization");
  check(normalizeClipName("mixamo:Idle") === "idle", "mixamo:Idle normalized to idle");
  check(normalizeClipName("Armature|walk_forward") === "walk", "walk_forward normalized to walk");
  check(normalizeClipName("player_run_loop") === "run", "player_run_loop normalized to run");
  check(normalizeClipName("sprint_fast") === "run", "sprint_fast normalized to run");
  check(normalizeClipName("dash_burst") === "run", "dash_burst normalized to run");
  check(normalizeClipName("dance_twist") === "action", "dance_twist normalized to action");
  check(normalizeClipName("emote_wave") === "action", "emote_wave normalized to action");
  check(normalizeClipName("jump_up") === "jump", "jump_up normalized to jump");
  check(normalizeClipName("unknown_track_1") === null, "unmatched name returns null");

  section("characterLoader: loading glTF model & animation mixer");
  clearModelCache();
  check(getCachedModelCount() === 0, "model cache starts empty");

  const scene = new THREE.Scene();
  const char1 = await loadCharacterModel("public/models/avatar.gltf", scene);

  check(!char1.isProceduralFallback, "glTF avatar loaded successfully (not procedural fallback)");
  check(char1.root instanceof THREE.Group, "char1.root is a THREE.Group");
  check(char1.mixer !== null, "char1.mixer is defined");
  check(char1.currentAction === "idle", "char1 starts in idle action");
  check(!!char1.actions.idle, "char1 has idle action");
  check(!!char1.actions.walk, "char1 has walk action");
  check(!!char1.actions.run, "char1 has run action");
  check(!!char1.actions.action, "char1 has action action");
  check(!!char1.actions.jump, "char1 has jump action");

  // State transitions
  char1.setAction("walk", 0.1);
  check(char1.currentAction === "walk", "setAction('walk') updates currentAction to walk");
  char1.update(0.1);

  char1.setAction("run", 0.1);
  check(char1.currentAction === "run", "setAction('run') updates currentAction to run");
  char1.update(0.1);

  char1.setAction("action", 0.1);
  check(char1.currentAction === "action", "setAction('action') updates currentAction to action");
  char1.update(0.1);

  char1.setAction("jump", 0.1);
  check(char1.currentAction === "jump", "setAction('jump') updates currentAction to jump");
  char1.update(0.1);

  section("characterLoader: model caching & bone cloning isolation");
  check(getCachedModelCount() === 1, "model cache has 1 cached model after first load");

  const char2 = await loadCharacterModel("public/models/avatar.gltf", scene);
  check(getCachedModelCount() === 1, "second load hits memory cache (count remains 1)");
  check(char1.root !== char2.root, "char1 root and char2 root are distinct instances");
  check(char1.mixer !== char2.mixer, "char1 mixer and char2 mixer are independent instances");

  // Find skinned mesh in char1 and char2
  let mesh1: THREE.SkinnedMesh | null = null;
  let mesh2: THREE.SkinnedMesh | null = null;
  char1.root.traverse((o) => {
    if ((o as THREE.SkinnedMesh).isSkinnedMesh) mesh1 = o as THREE.SkinnedMesh;
  });
  char2.root.traverse((o) => {
    if ((o as THREE.SkinnedMesh).isSkinnedMesh) mesh2 = o as THREE.SkinnedMesh;
  });

  check(mesh1 !== null && mesh2 !== null, "both instances have SkinnedMesh");
  if (mesh1 && mesh2) {
    check(mesh1 !== mesh2, "skinned meshes are distinct cloned objects");
    check(
      mesh1.skeleton !== mesh2.skeleton,
      "skeletons are isolated via SkeletonUtils.clone (no shared bone hierarchy)"
    );
    check(
      mesh1.skeleton.bones[0] !== mesh2.skeleton.bones[0],
      "bones between peers are completely independent"
    );
  }

  char1.dispose();
  char2.dispose();

  section("characterLoader: graceful procedural avatar fallback");
  // Empty URL fallback
  const emptyFallback = await loadCharacterModel("", scene);
  check(emptyFallback.isProceduralFallback, "empty URL falls back to procedural avatar");
  check(emptyFallback.root instanceof THREE.Group, "fallback has THREE.Group root");
  check(emptyFallback.currentAction === "idle", "fallback starts at idle");
  emptyFallback.setAction("run");
  check(emptyFallback.currentAction === "run", "fallback setAction('run') updates state");
  emptyFallback.update(0.16); // animates procedural limbs without error
  emptyFallback.dispose();

  // Missing URL fallback (simulating network failure or 404)
  const missingFallback = await loadCharacterModel("models/non_existent_avatar_99.glb", scene);
  check(
    missingFallback.isProceduralFallback,
    "missing URL gracefully falls back without throwing or crashing"
  );
  missingFallback.setAction("walk");
  check(missingFallback.currentAction === "walk", "missing fallback setAction works");
  missingFallback.update(0.16);
  missingFallback.dispose();

  // Explicit procedural creation
  const explicitProc = createProceduralCharacterInstance("atlas", scene);
  check(explicitProc.isProceduralFallback, "explicit procedural instance marked as fallback");
  explicitProc.setAction("action");
  explicitProc.update(0.16);
  explicitProc.setAction("jump");
  explicitProc.update(0.16);
  explicitProc.dispose();

  section("fx: high-energy locomotion FX and emitters");
  const fxScene = new THREE.Scene();
  const dashTrail = createDashTrail(fxScene);
  check(dashTrail.getActiveCount() === 0, "dash trail starts with 0 active particles");

  // Not sprinting: no particles spawned
  dashTrail.update(0.05, new THREE.Vector3(0, 0, 0), false);
  check(dashTrail.getActiveCount() === 0, "no particles spawned when not sprinting");

  // Sprinting: particles spawned
  dashTrail.update(0.05, new THREE.Vector3(1, 0, 2), true);
  check(dashTrail.getActiveCount() > 0, "particles spawned when sprinting");

  // After some time, particles decay
  for (let i = 0; i < 15; i++) {
    dashTrail.update(0.05, new THREE.Vector3(1, 0, 2), false);
  }
  check(dashTrail.getActiveCount() === 0, "particles decay and recycle after lifetime expires");
  dashTrail.dispose();

  // Footstep sparks
  const sparks = createFootstepSparks(fxScene);
  check(sparks.getActiveCount() === 0, "footstep sparks start with 0 active particles");
  sparks.trigger(new THREE.Vector3(0, 0, 0));
  check(sparks.getActiveCount() > 0, "triggering sparks spawns motes at position");

  for (let i = 0; i < 10; i++) {
    sparks.update(0.05, new THREE.Vector3(0, 0, 0), false);
  }
  check(sparks.getActiveCount() === 0, "sparks decay over time");
  sparks.dispose();

  // Action shockwave
  createActionShockwave(fxScene, new THREE.Vector3(2, 0, 3));
  check(fxScene.children.some((c) => c instanceof THREE.Mesh), "shockwave ring added to scene");
  updateActionShockwaves();
  clearActionShockwaves();

  section("controls: camera trauma, FOV rush & collision zoom guard");
  resetCameraTrauma();
  check(getCameraTrauma() === 0, "camera trauma starts at 0");

  applyCameraTrauma(0.4);
  check(near(getCameraTrauma(), 0.4), "applyCameraTrauma(0.4) increases trauma to 0.4");

  applyCameraTrauma(0.8);
  check(getCameraTrauma() === 1.0, "trauma is clamped at maximum 1.0");

  // Non-finite and NaN trauma rejection guards
  resetCameraTrauma();
  applyCameraTrauma(0.45);
  applyCameraTrauma(NaN);
  check(near(getCameraTrauma(), 0.45), "applyCameraTrauma(NaN) is safely rejected without poisoning trauma");
  applyCameraTrauma(Infinity);
  check(near(getCameraTrauma(), 0.45), "applyCameraTrauma(Infinity) is safely rejected");
  applyCameraTrauma(-Infinity);
  check(near(getCameraTrauma(), 0.45), "applyCameraTrauma(-Infinity) is safely rejected");
  applyCameraTrauma("invalid" as unknown as number);
  check(near(getCameraTrauma(), 0.45), "applyCameraTrauma non-number input is safely rejected");
  resetCameraTrauma();
  // Seed trauma so updateCameraDynamics produces a non-zero shake offset
  applyCameraTrauma(0.6);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  // Sprinting: FOV rush should expand toward baseFov + 4 (59)
  const sprintDynamics = updateCameraDynamics(camera, true, 0.1, 55);
  check(camera.fov > 55, "sprinting increases camera FOV (FOV rush)");
  check(sprintDynamics.trauma < 1.0, "trauma decays smoothly over time");
  check(sprintDynamics.shakeOffset.length() > 0, "shake offset generated while trauma > 0");

  // Walking: FOV should return toward baseFov (55)
  for (let i = 0; i < 20; i++) {
    updateCameraDynamics(camera, false, 0.1, 55);
  }
  check(camera.fov < 57, "non-sprinting returns camera FOV toward base");
  check(getCameraTrauma() === 0, "trauma fully decays to 0 after enough time");

  // Room boundary collision zoom guard
  const loungeBounds: RoomBounds = { minX: -11.8, maxX: 11.8, minZ: -8.8, maxZ: 8.8, margin: 0.5 };
  const targetPos = new THREE.Vector3(0, 1.2, 0);

  // Camera inside room: position is untouched
  const insideCam = new THREE.Vector3(3, 2, 4);
  const safeInside = checkRoomBoundaryCollision(insideCam, targetPos, loungeBounds);
  check(near(safeInside.x, 3) && near(safeInside.z, 4), "camera inside room remains untouched");

  // Camera outside room (+X wall clipping): clamped inside margin
  const outsideCamX = new THREE.Vector3(15, 2, 0);
  const safeClampedX = checkRoomBoundaryCollision(outsideCamX, targetPos, loungeBounds);
  check(safeClampedX.x <= 11.8 - 0.5, "camera outside +X wall is clamped inside room margin");
  check(safeClampedX.x > 0, "clamped camera stays along ray from target");

  // Camera outside room (-Z wall clipping): clamped inside margin
  const outsideCamZ = new THREE.Vector3(0, 2, -14);
  const safeClampedZ = checkRoomBoundaryCollision(outsideCamZ, targetPos, loungeBounds);
  check(safeClampedZ.z >= -8.8 + 0.5, "camera outside -Z wall is clamped inside room margin");

  // Near-wall collision guard (avatar 0.3m from wall, maxT < 0.6m)
  // +X wall: effective maxX = 11.8 - 0.5 = 11.3
  const nearWallPlayerX = new THREE.Vector3(11.0, 1.2, 0); // 11.3 - 11.0 = 0.3m from margin
  const outsideNearCamX = new THREE.Vector3(14.5, 2.0, 0);
  const clampedNearWallX = checkRoomBoundaryCollision(outsideNearCamX, nearWallPlayerX, loungeBounds);
  check(
    clampedNearWallX.x <= loungeBounds.maxX - (loungeBounds.margin ?? 0.5),
    "camera position with near-wall player remains strictly <= maxX - margin"
  );
  check(
    clampedNearWallX.x >= nearWallPlayerX.x,
    "clamped camera remains along ray between player and wall"
  );

  // +Z wall: effective maxZ = 8.8 - 0.5 = 8.3
  const nearWallPlayerZ = new THREE.Vector3(0, 1.2, 8.0); // 8.3 - 8.0 = 0.3m from margin
  const outsideNearCamZ = new THREE.Vector3(0, 2.0, 12.0);
  const clampedNearWallZ = checkRoomBoundaryCollision(outsideNearCamZ, nearWallPlayerZ, loungeBounds);
  check(
    clampedNearWallZ.z <= loungeBounds.maxZ - (loungeBounds.margin ?? 0.5),
    "camera position with near-wall player remains strictly <= maxZ - margin"
  );
  check(
    clampedNearWallZ.z >= nearWallPlayerZ.z,
    "clamped camera remains along ray between player and +Z wall"
  );
}
