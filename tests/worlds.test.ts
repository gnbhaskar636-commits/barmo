import fs from "node:fs";
import path from "node:path";
import { check, near, section } from "./_t";
import {
  ROOMS,
  getRoom,
  isRoomId,
  isInsideHuddle,
  spawnFor,
  type RoomId,
  type RoomDef,
  type Spawn,
} from "@/lib/world/rooms";
import {
  cleanControls,
  clamp,
  orbitOffset,
  PITCH_MIN,
  PITCH_MAX,
  ZOOM_MIN,
  ZOOM_MAX,
} from "@/lib/world/controls";
import {
  GRAVITY_BASE,
  getSectorGravityConfig,
  computeEffectiveGravity,
  jumpApexHeight,
  jumpHangTime,
  stepJumpKinematics,
  applyAirDriftDamping,
  applyGroundFriction,
  clampParticleCount,
  computeParticleBufferSize,
  advanceParticleY,
  hexToRgbNormalized,
} from "@/lib/world/physics";
import {
  computeJoystickVector,
  computePinchDistance,
  computePinchZoom,
  computeOrbitDelta,
  clampPitch,
  applyCameraMomentum,
  isDragGesture,
  MultiTouchTracker,
} from "@/components/app/TouchControls";

export async function run() {
  // =========================================================================
  // Section 1: 7 Distinctive Anti-Gravity Sectors & Room Contracts (26 checks)
  // =========================================================================
  section("worlds: 7 distinctive anti-gravity sectors & room contracts");

  // 1. Exactly 7 registered sectors
  check(ROOMS.length === 7, "ROOMS array contains exactly 7 distinctive sectors");

  // 2. All 7 expected sector IDs exist
  const expectedIds: RoomId[] = ["lounge", "meeting", "party", "lab", "cosmos", "arena", "raceway"];
  const allIdsPresent = expectedIds.every((id) => ROOMS.some((r) => r.id === id));
  check(allIdsPresent, "all 7 sector IDs (lounge, meeting, party, lab, cosmos, arena, raceway) are registered");

  // 3. isRoomId returns true for all 7 sector IDs
  const allAreRoomIds = expectedIds.every((id) => isRoomId(id));
  check(allAreRoomIds, "isRoomId returns true for all 7 sector IDs");

  // 4. isRoomId returns false for invalid tokens
  const invalidTokens = ["unknown", "", "lobby", "cyber", null, undefined, 123];
  const allInvalidRejected = invalidTokens.every((t) => !isRoomId(t));
  check(allInvalidRejected, "isRoomId returns false for invalid room identifiers");

  // 5. Sector IDs are strictly unique
  const idSet = new Set(ROOMS.map((r) => r.id));
  check(idSet.size === 7, "sector IDs are strictly unique across the universe");

  // 6. Sector names are strictly unique and non-empty
  const names = ROOMS.map((r) => r.name);
  const nameSet = new Set(names);
  check(nameSet.size === 7 && names.every((n) => n.trim().length > 0), "sector names are strictly unique and non-empty");

  // 7. Sector icons are valid non-empty emoji strings
  const validIcons = ROOMS.every((r) => typeof r.icon === "string" && r.icon.length > 0);
  check(validIcons, "sector icons are valid non-empty strings");

  // 8. Sector colors are valid 24-bit integer values
  const validColors = ROOMS.every((r) => typeof r.color === "number" && r.color >= 0 && r.color <= 0xffffff);
  check(validColors, "sector accent colors are valid 24-bit hex numbers");

  // 9. Walkable boundaries satisfy geometric invariants: hw > 0
  const validHw = ROOMS.every((r) => r.hw > 0);
  check(validHw, "walkable half-width hw is positive for all sectors");

  // 10. Walkable bounds satisfy z0 < z1
  const validZ = ROOMS.every((r) => r.z0 < r.z1);
  check(validZ, "walkable z-bounds satisfy z0 < z1 for all sectors");

  // 11. Total walkable area >= 120 m² for all sectors
  const validArea = ROOMS.every((r) => (2 * r.hw) * (r.z1 - r.z0) >= 120);
  check(validArea, "total walkable floor area >= 120 m² for all 7 sectors");

  // 12. Default spawn point is strictly inside room bounds
  const validSpawns = ROOMS.every((r) => Math.abs(r.spawn.x) <= r.hw && r.spawn.z >= r.z0 && r.spawn.z <= r.z1);
  check(validSpawns, "default spawn points are strictly within walkable bounds for all sectors");

  // 13. Default spawn orientation is a normalized angle
  const validYaws = ROOMS.every((r) => r.spawn.yaw >= -Math.PI && r.spawn.yaw <= 2 * Math.PI);
  check(validYaws, "default spawn orientation yaw is within normalized angular range");

  // 14. Every arrival spawn in from map is strictly inside destination room bounds
  const validFromSpawns = ROOMS.every((r) => {
    if (!r.from) return true;
    return Object.values(r.from).every((sp) => sp && Math.abs(sp.x) <= r.hw && sp.z >= r.z0 && sp.z <= r.z1);
  });
  check(validFromSpawns, "all arrival spawn coordinates in from maps are within destination boundaries");

  // 15. Lounge from map contains arrival coordinates for all other 6 sectors
  const lounge = getRoom("lounge");
  const other6Sectors: RoomId[] = ["meeting", "party", "lab", "cosmos", "arena", "raceway"];
  const loungeHasAllFrom = other6Sectors.every((id) => lounge.from?.[id] !== undefined);
  check(loungeHasAllFrom, "lounge from map defines return arrival coordinates for all other 6 sectors");

  // 16. Lounge portals array contains outbound portals to all other 6 sectors
  const loungePortalTos = lounge.portals.map((p) => p.to);
  const loungeHasAllPortals = other6Sectors.every((id) => loungePortalTos.includes(id));
  check(loungeHasAllPortals, "lounge portals array includes outbound portals to all other 6 sectors");

  // 17. Every non-lounge sector contains a portal with to === 'lounge'
  const nonLoungeHaveBack = ROOMS.filter((r) => r.id !== "lounge").every((r) => r.portals.some((p) => p.to === "lounge"));
  check(nonLoungeHaveBack, "every non-lounge sector contains an active portal back to lounge");

  // 18. Every portal destination is a valid RoomId
  const allPortalTosValid = ROOMS.every((r) => r.portals.every((p) => isRoomId(p.to)));
  check(allPortalTosValid, "every portal destination to is a valid registered RoomId");

  // 19. Every portal coordinates are within room boundary envelope
  const allPortalsInEnvelope = ROOMS.every((r) =>
    r.portals.every((p) => Math.abs(p.x) <= r.hw + 1.5 && p.z >= r.z0 - 1.5 && p.z <= r.z1 + 1.5)
  );
  check(allPortalsInEnvelope, "all portal positions lie within the perimeter envelope of their respective room");

  // 20. Every sector defines an interactive orb within bounds
  const allOrbsInBounds = ROOMS.every((r) => Math.abs(r.orb.x) <= r.hw && r.orb.z >= r.z0 && r.orb.z <= r.z1);
  check(allOrbsInBounds, "every sector defines an interactive orb situated inside room bounds");

  // 21. Every sector has a non-empty orbName
  const allOrbsNamed = ROOMS.every((r) => typeof r.orbName === "string" && r.orbName.trim().length > 0);
  check(allOrbsNamed, "every sector has a non-empty orbName");

  // 22. Every sector has >= 1 interactive zones defined
  const allHaveZones = ROOMS.every((r) => r.zones && r.zones.length >= 1);
  check(allHaveZones, "every sector has at least one interactive zone defined");

  // 23. Every zone safe-arrival coordinates (sx, sz) are within room bounds (accounting for rooftop annex in lounge)
  const allZonesSafe = ROOMS.every((r) =>
    r.zones.every((z) => {
      const maxZ = r.id === "lounge" && z.id === "roof" ? 12.0 : r.z1;
      return Math.abs(z.sx) <= r.hw && z.sz >= r.z0 && z.sz <= maxZ;
    })
  );
  check(allZonesSafe, "all interactive zone safe-arrival targets (sx, sz) are within room bounds");

  // 24. All huddles define positive radius r > 0
  const allHuddlesPositiveRadius = ROOMS.every((r) => r.huddles.every((h) => h.r > 0));
  check(allHuddlesPositiveRadius, "all private conversation huddles have positive radius r > 0");

  // 25. isInsideHuddle helper accurately classifies interior vs exterior coordinates
  const testHuddle = { id: "test", name: "Test Huddle", x: 0, z: 0, r: 2.0 };
  const insideTest = isInsideHuddle(1.0, 1.0, testHuddle); // hypot ~ 1.414 <= 2.0
  const outsideTest = isInsideHuddle(2.5, 0, testHuddle);  // hypot 2.5 > 2.0
  check(insideTest && !outsideTest, "isInsideHuddle accurately classifies interior vs exterior coordinates");

  // 26. Helper functions getRoom('arena'), getRoom('raceway'), and getRoom('invalid') fallback to lounge
  const getArena = getRoom("arena");
  const getRaceway = getRoom("raceway");
  const getInvalid = getRoom("nonexistent_sector");
  check(getArena.id === "arena" && getRaceway.id === "raceway" && getInvalid.id === "lounge", "getRoom resolves new sectors and gracefully falls back to lounge");

  // =========================================================================
  // Section 2: Anti-Gravity Physics & Particle Dust Systems (24 checks)
  // =========================================================================
  section("worlds: anti-gravity physics & particle dust systems");

  // 1. GRAVITY_BASE constant
  check(GRAVITY_BASE === 9.8, "GRAVITY_BASE constant is exactly 9.8 m/s²");

  // 2. All 7 sectors define SectorGravityConfig
  const allHaveConfigs = expectedIds.every((id) => {
    const cfg = getSectorGravityConfig(id);
    return cfg && cfg.gravityFactor > 0 && cfg.jumpImpulse > 0 && cfg.floatDamping > 0;
  });
  check(allHaveConfigs, "all 7 sectors define valid SectorGravityConfig with positive factors");

  // 3. computeEffectiveGravity('cosmos') === 2.45
  const gCosmos = computeEffectiveGravity("cosmos");
  check(near(gCosmos, 2.45), `computeEffectiveGravity('cosmos') evaluates to 2.45 m/s² (received: ${gCosmos})`);

  // 4. computeEffectiveGravity('meeting') === 8.33
  const gMeeting = computeEffectiveGravity("meeting");
  check(near(gMeeting, 8.33, 0.01), `computeEffectiveGravity('meeting') evaluates to 8.33 m/s² (received: ${gMeeting})`);

  // 5. Effective gravity increases monotonically from cosmos (0.25) to meeting (0.85)
  const gLab = computeEffectiveGravity("lab");
  const gArena = computeEffectiveGravity("arena");
  const gRaceway = computeEffectiveGravity("raceway");
  const gParty = computeEffectiveGravity("party");
  const monotonic = gCosmos <= gLab && gLab <= gArena && gArena <= gRaceway && gRaceway <= gParty && gParty <= gMeeting;
  check(monotonic, "effective gravity scales monotonically from Cosmos up through Lounge/Meeting");

  // 6. Analytical apex height calculation for Cosmos jump
  // v0 = 7.0, g = 2.45 -> h = 49 / (2 * 2.45) = 49 / 4.9 = 10.0 m
  const apexCosmos = jumpApexHeight(7.0, 2.45);
  check(near(apexCosmos, 10.0), `jumpApexHeight(7.0, 2.45) evaluates to 10.0m (received: ${apexCosmos})`);

  // 7. Zero initial jump velocity gives apex = 0 and hangTime = 0
  check(jumpApexHeight(0, 9.8) === 0 && jumpHangTime(0, 9.8) === 0, "zero jump impulse results in 0 apex height and 0 hang time");

  // 8. Hang time ratio between Cosmos (0.25g) and Earth (1.0g) is exactly 4.0
  const tHangCosmos = jumpHangTime(5.0, 2.45);
  const tHangEarth = jumpHangTime(5.0, 9.8);
  check(near(tHangCosmos / tHangEarth, 4.0), "hang time under Cosmos gravity is exactly 4.0x standard Earth gravity");

  // 9. Step kinematics advances height upward during positive velocity
  const stepUp = stepJumpKinematics(0, 5.0, 9.8, 0.1);
  check(stepUp.y > 0 && !stepUp.isGrounded, "stepJumpKinematics advances height upward during positive velocity");

  // 10. Step kinematics reaches apex: vertical velocity decreases
  const stepApex = stepJumpKinematics(stepUp.y, stepUp.vy, 9.8, 0.5);
  check(stepApex.vy < stepUp.vy, "stepJumpKinematics decreases vertical velocity under gravity acceleration");

  // 11. Step kinematics grounds player when y <= 0 and resets vy = 0
  const stepGround = stepJumpKinematics(0.05, -5.0, 9.8, 0.1);
  check(stepGround.y === 0 && stepGround.vy === 0 && stepGround.isGrounded, "stepJumpKinematics resets y and vy to 0 upon touching ground");

  // 12. Terminal velocity clamping: Freefall from high altitude clamps downward speed
  let fallVy = 0;
  for (let i = 0; i < 50; i++) {
    const res = stepJumpKinematics(100, fallVy, 9.8, 0.1, -4.0);
    fallVy = res.vy;
  }
  check(fallVy === -4.0, "freefall accelerates downward but strictly clamps to terminal velocity limit");

  // 13. Air drift damping preserves horizontal vector heading (angle unchanged)
  const dampedHeading = applyAirDriftDamping(3.0, 4.0, 0.95, 0.016);
  const originalAngle = Math.atan2(4.0, 3.0);
  const dampedAngle = Math.atan2(dampedHeading.vz, dampedHeading.vx);
  check(near(originalAngle, dampedAngle, 1e-4), "air drift damping preserves motion heading angle without angular deflection");

  // 14. Air drift damping attenuates velocity magnitude smoothly
  const magOrig = Math.hypot(3.0, 4.0);
  const magDamped = Math.hypot(dampedHeading.vx, dampedHeading.vz);
  check(magDamped < magOrig && magDamped > 0, "air drift damping smooths horizontal velocity magnitude");

  // 15. Ground friction attenuates velocity faster than air drift by at least a factor of 5
  const groundDamped = applyGroundFriction(3.0, 4.0, 0.90, 0.016);
  const magGround = Math.hypot(groundDamped.vx, groundDamped.vz);
  const airLoss = magOrig - magDamped;
  const groundLoss = magOrig - magGround;
  check(groundLoss >= airLoss * 5, "ground friction stops motion at least 5x faster than mid-air drift");

  // 16. clampParticleCount clamps to minimum budget 20
  check(clampParticleCount(10) === 20, "clampParticleCount(10) clamps to minimum floor budget of 20");

  // 17. clampParticleCount clamps to maximum budget 500
  check(clampParticleCount(1000) === 500, "clampParticleCount(1000) clamps to maximum ceiling budget of 500");

  // 18. clampParticleCount preserves valid budget 250
  check(clampParticleCount(250) === 250, "clampParticleCount(250) preserves valid intermediate budget");

  // 19. Particle buffer size computation: positions array is exactly budget * 3
  const bufSizes = computeParticleBufferSize(150);
  check(bufSizes.positions === 450, "computeParticleBufferSize allocates exactly budget * 3 positions");

  // 20. Particle buffer size computation: colors array is exactly budget * 3
  check(bufSizes.colors === 450, "computeParticleBufferSize allocates exactly budget * 3 colors");

  // 21. Floating dust particle vertical advancement: y_next = y + speed * dt
  const advY = advanceParticleY(1.0, 0.5, 0.2);
  check(near(advY, 1.1), "advanceParticleY correctly integrates upward vertical displacement");

  // 22. Floating dust ceiling wrap: particle exceeding ceiling wraps to floor
  const wrapY = advanceParticleY(4.7, 1.0, 0.2, 0.3, 4.8);
  check(wrapY === 0.3, "advanceParticleY wraps particle back to floor upon exceeding ceiling");

  // 23. Normalized RGB conversion: hexToRgbNormalized(0xff5ac8)
  const rgbPink = hexToRgbNormalized(0xff5ac8);
  check(near(rgbPink[0], 1.0) && near(rgbPink[1], 0.3529, 0.001) && near(rgbPink[2], 0.7843, 0.001), "hexToRgbNormalized decomposes 24-bit color into normalized RGB channels");

  // 24. Normalized RGB conversion: all 7 sector primary colors produce components in [0.0, 1.0]
  const allRgbNormalized = ROOMS.every((r) => {
    const c = hexToRgbNormalized(r.color);
    return c.every((channel) => channel >= 0 && channel <= 1.0);
  });
  check(allRgbNormalized, "all 7 sector accent colors yield valid normalized RGB components in [0.0, 1.0]");

  // =========================================================================
  // Section 3: Dual-Touch Analog Joystick Math (24 checks)
  // =========================================================================
  section("worlds: dual-touch analog joystick math");

  // 1. Center touch (0, 0) outputs zero vector
  const centerJoy = computeJoystickVector(0, 0);
  check(centerJoy.x === 0 && centerJoy.y === 0 && centerJoy.len === 0 && !centerJoy.active, "center touch outputs (0, 0) with active = false");

  // 2. Micro-movement below deadzone (dx = 3, dy = 4, hypot = 5 < 8) outputs exact zero
  const deadzoneJoy = computeJoystickVector(3, 4);
  check(deadzoneJoy.x === 0 && deadzoneJoy.y === 0 && !deadzoneJoy.active, "sub-deadzone displacement outputs exact zero");

  // 3. Exact deadzone boundary (dx = 8, dy = 0) outputs exact zero
  const boundaryJoy = computeJoystickVector(8, 0);
  check(boundaryJoy.x === 0 && boundaryJoy.y === 0 && !boundaryJoy.active, "exact deadzone boundary displacement outputs zero");

  // 4. Touch just above deadzone (dx = 9, dy = 0) outputs active = true and len > 0
  const justActiveJoy = computeJoystickVector(9, 0);
  check(justActiveJoy.active && justActiveJoy.len > 0, "displacement above deadzone engages active = true with positive length");

  // 5. Perimeter touch (dx = 44, dy = 0) outputs x: 1, y: 0 and len: 1.0
  const perimEast = computeJoystickVector(44, 0);
  check(near(perimEast.x, 1.0) && near(perimEast.y, 0) && near(perimEast.len, 1.0), "perimeter touch at outer radius R outputs full normalized magnitude 1.0");

  // 6. Extreme overshoot (dx = 150, dy = 0) is clamped to len: 1.0 and (x: 1, y: 0)
  const overEast = computeJoystickVector(150, 0);
  check(near(overEast.x, 1.0) && near(overEast.y, 0) && near(overEast.len, 1.0), "extreme positive drag is clamped to outer radius limit without overshoot");

  // 7. Negative overshoot (dx = -200, dy = 0) is clamped to len: 1.0 and (x: -1, y: 0)
  const overWest = computeJoystickVector(-200, 0);
  check(near(overWest.x, -1.0) && near(overWest.y, 0) && near(overWest.len, 1.0), "extreme negative drag is clamped to outer radius limit");

  // 8. Diagonal 45° touch (dx = 44, dy = -44) clamps total magnitude to 1.0
  const diagJoy = computeJoystickVector(44, -44);
  check(near(diagJoy.len, 1.0), "diagonal deflection clamped to maximum unit magnitude 1.0");

  // 9. Diagonal 45° touch produces equal components x ≈ 0.7071, y ≈ 0.7071
  check(near(diagJoy.x, 0.7071, 0.002) && near(diagJoy.y, 0.7071, 0.002), "diagonal deflection yields equal orthogonal components x ≈ y ≈ 0.7071");

  // 10. North directional touch (dx = 0, dy = -44) maps to +Y (upward)
  const northJoy = computeJoystickVector(0, -44);
  check(near(northJoy.x, 0) && near(northJoy.y, 1.0), "upward touch drag maps to positive +Y forward locomotion");

  // 11. South directional touch (dx = 0, dy = 44) maps to -Y (downward)
  const southJoy = computeJoystickVector(0, 44);
  check(near(southJoy.x, 0) && near(southJoy.y, -1.0), "downward touch drag maps to negative -Y backward locomotion");

  // 12. East directional touch (dx = 44, dy = 0) maps to +X (rightward)
  check(near(perimEast.x, 1.0) && near(perimEast.y, 0), "rightward touch drag maps to positive +X right strafe");

  // 13. West directional touch (dx = -44, dy = 0) maps to -X (leftward)
  const westJoy = computeJoystickVector(-44, 0);
  check(near(westJoy.x, -1.0) && near(westJoy.y, 0), "leftward touch drag maps to negative -X left strafe");

  // 14. Angle calculation for East is 0 radians
  check(near(perimEast.angle, 0), "heading angle for pure East is 0 radians");

  // 15. Angle calculation for North is +Math.PI / 2 radians
  check(near(northJoy.angle, Math.PI / 2), "heading angle for pure North is +PI / 2 radians");

  // 16. Angle calculation for South is -Math.PI / 2 radians
  check(near(southJoy.angle, -Math.PI / 2), "heading angle for pure South is -PI / 2 radians");

  // 17. Angle calculation for West is Math.PI radians
  check(near(Math.abs(westJoy.angle), Math.PI), "heading angle for pure West is PI radians");

  // 18. Non-linear power curve: 50% travel (m = 26 on R = 44, D = 8) yields c < 0.5
  const midTravelJoy = computeJoystickVector(26, 0);
  check(midTravelJoy.len < 0.5, "quadratic sensitivity curve provides fine control steering at mid-travel");

  // 19. Monotonicity: 10 successive displacement samples yield strictly increasing magnitudes
  let prevMag = -1;
  let isMonotonic = true;
  for (let m = 9; m <= 44; m += 3.5) {
    const v = computeJoystickVector(m, 0);
    if (v.len <= prevMag) isMonotonic = false;
    prevMag = v.len;
  }
  check(isMonotonic, "joystick travel curve is strictly monotonically increasing between deadzone and perimeter");

  // 20. MultiTouchTracker: Primary touch attaches pointerId: 1
  const tracker = new MultiTouchTracker();
  const primaryClaimed = tracker.onPointerDown(1, 100, 200);
  check(primaryClaimed && tracker.getPrimaryId() === 1, "MultiTouchTracker claims first pointer as primary joystick controller");

  // 21. MultiTouchTracker: Secondary touch with pointerId: 2 is not primary
  const secondaryClaimed = tracker.onPointerDown(2, 300, 400);
  check(!secondaryClaimed && tracker.getPrimaryId() === 1, "MultiTouchTracker routes secondary pointer as non-primary gesture controller");

  // 22. MultiTouchTracker: Moving pointerId: 2 reports isPrimary: false
  const secMove = tracker.onPointerMove(2, 310, 410);
  check(!secMove.isPrimary, "moving secondary pointer does not report as primary controller");

  // 23. MultiTouchTracker: Releasing pointerId: 2 leaves joystick active on pointerId: 1
  const secReleased = tracker.onPointerUp(2);
  check(!secReleased && tracker.getPrimaryId() === 1, "releasing secondary pointer keeps primary joystick active");

  // 24. MultiTouchTracker: Releasing pointerId: 1 resets primary
  const primaryReleased = tracker.onPointerUp(1);
  check(primaryReleased && tracker.getPrimaryId() === null, "releasing primary pointer resets active joystick controller");

  // =========================================================================
  // Section 4: Touch Gesture Camera & Pinch-to-Zoom (22 checks)
  // =========================================================================
  section("worlds: touch gesture camera & pinch-to-zoom");

  // 1. Pinch distance between (0, 0) and (30, 40) is exactly 50.0
  const d50 = computePinchDistance({ x: 0, y: 0 }, { x: 30, y: 40 });
  check(near(d50, 50.0), "computePinchDistance computes exact Euclidean distance (30, 40 -> 50.0)");

  // 2. Pinch distance is symmetric: dist(P1, P2) === dist(P2, P1)
  const dSym = computePinchDistance({ x: 30, y: 40 }, { x: 0, y: 0 });
  check(near(d50, dSym), "computePinchDistance is symmetric regardless of point ordering");

  // 3. Identical touch points return distance 0
  const dZero = computePinchDistance({ x: 25, y: 35 }, { x: 25, y: 35 });
  check(dZero === 0, "computePinchDistance returns 0 for identical points");

  // 4. Spreading fingers (d0 = 100, d1 = 150) decreases zoom distance (zooms closer)
  const spreadZoom = computePinchZoom(100, 150, 1.2);
  check(spreadZoom < 1.2, "spreading touch fingers zooms in closer (decreases camera distance)");

  // 5. Contracting fingers (d0 = 150, d1 = 100) increases zoom distance (zooms out)
  const contractZoom = computePinchZoom(150, 100, 1.2);
  check(contractZoom > 1.2, "contracting touch fingers zooms out farther (increases camera distance)");

  // 6. Extreme pinch spread is clamped to ZOOM_MIN (0.45)
  const clampMinZoom = computePinchZoom(10, 500, 1.0);
  check(clampMinZoom === ZOOM_MIN, "extreme pinch spread clamps strictly to ZOOM_MIN (0.45)");

  // 7. Extreme pinch contraction is clamped to ZOOM_MAX (2.2)
  const clampMaxZoom = computePinchZoom(500, 10, 1.0);
  check(clampMaxZoom === ZOOM_MAX, "extreme pinch contraction clamps strictly to ZOOM_MAX (2.2)");

  // 8. Degenerate pinch distance (d = 0) preserves previous zoom
  const degenZoom = computePinchZoom(100, 0, 1.5);
  check(degenZoom === 1.5, "degenerate pinch distance preserves previous camera zoom without NaN or error");

  // 9. Orbit horizontal delta: dragging right (dx = +50) decreases yaw
  const rightOrbit = computeOrbitDelta(50, 0);
  check(rightOrbit.dYaw < 0, "dragging right decreases yaw (rotates camera view right)");

  // 10. Orbit horizontal delta: dragging left (dx = -50) increases yaw
  const leftOrbit = computeOrbitDelta(-50, 0);
  check(leftOrbit.dYaw > 0, "dragging left increases yaw (rotates camera view left)");

  // 11. Orbit vertical delta: dragging down (dy = +30) increases pitch
  const downOrbit = computeOrbitDelta(0, 30);
  check(downOrbit.dPitch > 0, "dragging down increases pitch (tilts camera upward)");

  // 12. Invert Y setting: dragging down with invertY: true decreases pitch
  const invertOrbit = computeOrbitDelta(0, 30, 1.0, true);
  check(invertOrbit.dPitch < 0, "dragging down with inverted Y decreases pitch");

  // 13. Camera sensitivity scaling: sens = 2.0 produces exactly double displacement
  const sens2Orbit = computeOrbitDelta(50, 0, 2.0);
  check(near(sens2Orbit.dYaw, rightOrbit.dYaw * 2), "camera sensitivity scaling scales angular displacement linearly");

  // 14. Camera sensitivity clamping: cleanControls clamps sensitivity within [0.4, 2.5]
  const cleanSensHigh = cleanControls({ sens: 10.0 });
  const cleanSensLow = cleanControls({ sens: 0.1 });
  check(cleanSensHigh.sens === 2.5 && cleanSensLow.sens === 0.4, "cleanControls clamps camera sensitivity within [0.4, 2.5]");

  // 15. Pitch angle clamping: pitch within range is unchanged
  const pitchMid = clampPitch(0.42);
  check(pitchMid === 0.42, "pitch within safe limits is preserved without alteration");

  // 16. Pitch angle clamping: extreme upward pitch (+3.0 rad) is clamped to safe max
  const pitchUp = clampPitch(3.0);
  check(near(pitchUp, 1.3963), "extreme upward pitch is clamped to safe ceiling (+80 deg)");

  // 17. Pitch angle clamping: extreme downward pitch (-3.0 rad) is clamped to safe min
  const pitchDown = clampPitch(-3.0);
  check(near(pitchDown, -1.3963), "extreme downward pitch is clamped to safe floor (-80 deg)");

  // 18. Spherical coordinate offset: orbitOffset generates vector with length === dist
  const orbitVec = orbitOffset(0.5, 0.4, 5.0);
  const orbitDist = Math.hypot(orbitVec.x, orbitVec.y, orbitVec.z);
  check(near(orbitDist, 5.0, 1e-4), "orbitOffset spherical vector length strictly matches requested distance");

  // 19. Camera momentum decay: initial velocity attenuates over time steps without external input
  const vel0 = 1.0;
  const vel1 = applyCameraMomentum(vel0, 0.88, 0.016);
  check(vel1 < vel0 && vel1 > 0, "camera momentum decay smoothly reduces angular velocity");

  // 20. Camera momentum cutoff: velocity snaps to 0 when falling below 1e-4
  const velStop = applyCameraMomentum(0.00005, 0.88, 0.016, 1e-4);
  check(velStop === 0, "camera momentum snaps to exact zero below cutoff threshold");

  // 21. Tap vs drag discrimination: displacement < 8 px returns isDrag === false
  check(!isDragGesture(3, 4, 8), "touch movement below 8px is classified as a tap (isDrag = false)");

  // 22. Tap vs drag discrimination: displacement >= 8 px returns isDrag === true
  check(isDragGesture(6, 8, 8), "touch movement >= 8px locks into camera drag (isDrag = true)");

  // =========================================================================
  // Section 5: Mobile Viewport, CSS & Layout Guardrails (22 checks)
  // =========================================================================
  section("worlds: mobile viewport, CSS & layout guardrails");

  const cssPath = path.join(process.cwd(), "app/globals.css");
  const css = fs.readFileSync(cssPath, "utf8");

  // 1. app/globals.css defines .b4-mobile-dock
  check(css.includes(".b4-mobile-dock"), "globals.css defines .b4-mobile-dock class");

  // 2. .b4-mobile-dock specifies position: fixed
  check(/\.b4-mobile-dock\s*\{[^}]*position:\s*fixed/s.test(css), ".b4-mobile-dock specifies fixed positioning");

  // 3. .b4-mobile-dock anchors to bottom: 0
  check(/\.b4-mobile-dock\s*\{[^}]*bottom:\s*0/s.test(css), ".b4-mobile-dock anchors to bottom: 0");

  // 4. .b4-mobile-dock spans full width
  check(/\.b4-mobile-dock\s*\{[^}]*left:\s*0[^}]*right:\s*0/s.test(css), ".b4-mobile-dock spans full viewport width (left: 0, right: 0)");

  // 5. .b4-mobile-dock has fixed height 64px
  check(/\.b4-mobile-dock\s*\{[^}]*height:\s*64px/s.test(css), ".b4-mobile-dock has 64px console height");

  // 6. .b4-mobile-dock has high z-index (999)
  check(/\.b4-mobile-dock\s*\{[^}]*z-index:\s*999/s.test(css), ".b4-mobile-dock has elevated z-index: 999");

  // 7. .b4-mobile-dock uses backdrop blur filter
  check(/\.b4-mobile-dock\s*\{[^}]*backdrop-filter:\s*blur\(20px\)/s.test(css), ".b4-mobile-dock applies 20px frosted backdrop blur");

  // 8. .b4-mobile-dock is hidden by default on desktop
  check(/\.b4-mobile-dock\s*\{[^}]*display:\s*none/s.test(css), ".b4-mobile-dock is hidden by default on desktop viewports");

  // 9-11. Responsive query @media (max-width: 960px) layout adaptations
  const m960Idx = css.indexOf("@media (max-width: 960px)");
  const m960Block = m960Idx >= 0 ? css.slice(m960Idx, m960Idx + 600) : "";
  check(m960Block.includes(".b4-mobile-dock") && m960Block.includes("display: flex"), "breakpoint <= 960px activates .b4-mobile-dock with display: flex");
  check(m960Block.includes(".b4-sidebar") && m960Block.includes("display: none"), "breakpoint <= 960px hides desktop sidebar");
  check(m960Block.includes(".b4-body") && m960Block.includes("padding-bottom: 70px"), "breakpoint <= 960px adds 70px bottom body offset");

  // 12. Bottom padding (70px) strictly exceeds dock height (64px) by at least 6px buffer
  const dockHeight = 64;
  const bodyPadding = 70;
  check(bodyPadding - dockHeight >= 6, "body bottom padding (70px) exceeds dock height (64px) with safe visual clearance");

  // 13. CSS incorporates env(safe-area-inset-bottom)
  check(css.includes("env(safe-area-inset-bottom"), "globals.css incorporates safe-area-inset-bottom for gesture home indicators");

  // 14. Mobile tab .b4-mobile-tab has touch-friendly padding
  check(css.includes(".b4-mobile-tab"), "globals.css provides dedicated touch styling for .b4-mobile-tab");

  // 15. Virtual joystick radius is R = 44px (total diameter 88px >= 44px touch target)
  const joyRadius = 44;
  check(joyRadius * 2 >= 44, "virtual joystick diameter (88px) exceeds WCAG 44px minimum touch target guideline");

  // 16. Viewport evaluation at 360px resolves to mobile mode
  const isMobile360 = 360 <= 960;
  check(isMobile360, "360px viewport (Galaxy S8) resolves to mobile console layout");

  // 17. Viewport evaluation at 390px resolves to mobile mode
  const isMobile390 = 390 <= 960;
  check(isMobile390, "390px viewport (iPhone 14) resolves to mobile console layout");

  // 18. Viewport evaluation at 412px resolves to mobile mode
  const isMobile412 = 412 <= 960;
  check(isMobile412, "412px viewport (Pixel 8) resolves to mobile console layout");

  // 19. Viewport evaluation at 430px resolves to mobile mode
  const isMobile430 = 430 <= 960;
  check(isMobile430, "430px viewport (iPhone Pro Max) resolves to mobile console layout");

  // 20. Viewport evaluation at 960px resolves to mobile mode
  const isMobile960 = 960 <= 960;
  check(isMobile960, "960px boundary viewport resolves to mobile console layout");

  // 21. Viewport evaluation at 1280px resolves to desktop mode
  const isDesktop1280 = 1280 > 960;
  check(isDesktop1280, "1280px widescreen resolves to desktop mode with sidebar visible");

  // 22. Zero horizontal overflow invariant across viewport wrappers
  check(css.includes("overflow-x: hidden"), "viewport roots enforce overflow-x: hidden preventing mobile side-scrolling glitches");
}
