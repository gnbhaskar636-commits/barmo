import { check, near, section } from "./_t";
import { ITEMS, ITEM, cleanGear, type Loadout } from "@/lib/economy/catalog";
import {
  equipItem,
  unequipItem,
  validatePurchase,
  toggleBoardVisibility,
} from "@/lib/progression/inventory";
import { CATALOG_ITEMS, getCatalogItem, filterCatalog } from "@/lib/progression/catalog";
import {
  equipItemInLoadout,
  unequipItemFromLoadout,
  toggleEquipItem,
  getEquippedSlots,
} from "@/lib/progression/loadout";
import {
  getCatalogItem as indexGetCatalogItem,
  equipItemInLoadout as indexEquipItemInLoadout,
} from "@/lib/progression";
import {
  getCtx,
  play,
  soundOn,
  setSound,
  getVolume,
  setVolume,
  getChannelVolume,
  setChannelVolume,
  tone,
  toneADSR,
  noise,
  useSound,
  _resetAudioContext,
  type Sfx,
} from "@/lib/sound";
import { computeHealth, isReady } from "@/lib/health";
import {
  ModerationEngine,
  clipString,
  sanitizeControlChars,
} from "@/lib/admin/moderation";
import { hasPermission, ROLE_PERMISSIONS, type AdminPermission, type PlatformRole } from "@/lib/admin/roles";
import { probePlatformHealth } from "@/lib/admin/telemetry";
import {
  recordAuditEvent,
  getAuditLogs,
  exportAuditLogsJson,
  clearAuditLogs,
} from "@/lib/admin/audit";
import manifest from "@/app/manifest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { BRAND, getCanonicalUrl } from "@/lib/brand.config";
import { ROOMS } from "@/lib/world/rooms";
import { GAMES } from "@/lib/games/types";

// =========================================================================
// Mock WebAudio Environment for Testing
// =========================================================================

class MockAudioParam {
  value: number;
  events: Array<{ type: string; value: number; time: number }> = [];

  constructor(initial = 1.0) {
    this.value = initial;
  }

  setValueAtTime(value: number, time: number) {
    this.value = value;
    this.events.push({ type: "setValue", value, time });
  }

  exponentialRampToValueAtTime(value: number, time: number) {
    this.value = value;
    this.events.push({ type: "exponentialRamp", value, time });
  }

  linearRampToValueAtTime(value: number, time: number) {
    this.value = value;
    this.events.push({ type: "linearRamp", value, time });
  }
}

class MockGainNode {
  gain = new MockAudioParam(1.0);
  connectedTo: unknown = null;

  connect(destination: unknown) {
    this.connectedTo = destination;
  }
}

class MockOscillatorNode {
  type: OscillatorType = "sine";
  frequency = new MockAudioParam(440);
  connectedTo: unknown = null;
  startedAt: number | null = null;
  stoppedAt: number | null = null;

  connect(destination: unknown) {
    this.connectedTo = destination;
  }

  start(time = 0) {
    this.startedAt = time;
  }

  stop(time = 0) {
    this.stoppedAt = time;
  }
}

class MockBiquadFilterNode {
  type: BiquadFilterType = "lowpass";
  frequency = new MockAudioParam(350);
  connectedTo: unknown = null;

  connect(destination: unknown) {
    this.connectedTo = destination;
  }
}

class MockAudioBuffer {
  numberOfChannels: number;
  length: number;
  sampleRate: number;
  channels: Float32Array[];

  constructor(numberOfChannels: number, length: number, sampleRate: number) {
    this.numberOfChannels = numberOfChannels;
    this.length = length;
    this.sampleRate = sampleRate;
    this.channels = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
  }

  getChannelData(channel: number): Float32Array {
    return this.channels[channel];
  }
}

class MockAudioBufferSourceNode {
  buffer: MockAudioBuffer | null = null;
  connectedTo: unknown = null;
  startedAt: number | null = null;
  stoppedAt: number | null = null;

  connect(destination: unknown) {
    this.connectedTo = destination;
  }

  start(time = 0) {
    this.startedAt = time;
  }

  stop(time = 0) {
    this.stoppedAt = time;
  }
}

class MockAudioContext {
  currentTime = 0;
  sampleRate = 44100;
  state: AudioContextState = "suspended";
  destination = { name: "MockDestinationNode" };
  oscillators: MockOscillatorNode[] = [];
  gains: MockGainNode[] = [];
  filters: MockBiquadFilterNode[] = [];
  bufferSources: MockAudioBufferSourceNode[] = [];
  resumed = false;
  rejectResume = false;

  async resume() {
    if (this.rejectResume) {
      throw new Error("Autoplay policy blocked AudioContext.resume()");
    }
    this.resumed = true;
    this.state = "running";
  }

  createOscillator(): MockOscillatorNode {
    const osc = new MockOscillatorNode();
    this.oscillators.push(osc);
    return osc;
  }

  createGain(): MockGainNode {
    const gain = new MockGainNode();
    this.gains.push(gain);
    return gain;
  }

  createBiquadFilter(): MockBiquadFilterNode {
    const filter = new MockBiquadFilterNode();
    this.filters.push(filter);
    return filter;
  }

  createBuffer(channels: number, length: number, sampleRate: number): MockAudioBuffer {
    return new MockAudioBuffer(channels, length, sampleRate);
  }

  createBufferSource(): MockAudioBufferSourceNode {
    const src = new MockAudioBufferSourceNode();
    this.bufferSources.push(src);
    return src;
  }
}

// =========================================================================
// Main Test Suite Runner for Platform Milestone 6
// =========================================================================

export async function runPlatformTests() {
  // =========================================================================
  // Section 1: Virtual Marketplace & Economy (24 checks)
  // =========================================================================
  section("platform: virtual marketplace & cosmetic economy");

  // 1. Catalog item count
  check(ITEMS.length === 9, "ITEMS catalog contains exactly 9 registered cosmetic items");

  // 2. Catalog lookup map completeness
  check(Object.keys(ITEM).length === 9, "ITEM lookup map indexes all 9 catalog items");

  // 3. Category distribution (3 hoverboards, 3 pets, 3 auras)
  const hbItems = ITEMS.filter((i) => i.kind === "hoverboard");
  const petItems = ITEMS.filter((i) => i.kind === "pet");
  const auraItems = ITEMS.filter((i) => i.kind === "aura");
  check(
    hbItems.length === 3 && petItems.length === 3 && auraItems.length === 3,
    "catalog evenly balances 3 hoverboards, 3 pets, and 3 auras"
  );

  // 4. Unique cosmetic IDs
  const uniqueIds = new Set(ITEMS.map((i) => i.id));
  check(uniqueIds.size === 9, "all 9 cosmetic item IDs are strictly unique");

  // 5. Positive token pricing
  check(ITEMS.every((i) => i.price > 0), "all cosmetic items have positive token purchase prices");

  // 6. Rarity distribution
  const rarities = ["common", "rare", "epic"];
  check(
    rarities.every((r) => ITEMS.some((i) => i.rarity === r)),
    "all 3 rarity tiers (common, rare, epic) are represented"
  );

  // 7. Monotonic price progression within hoverboard category
  check(
    hbItems.find((i) => i.rarity === "common")!.price <
      hbItems.find((i) => i.rarity === "rare")!.price &&
      hbItems.find((i) => i.rarity === "rare")!.price <
        hbItems.find((i) => i.rarity === "epic")!.price,
    "hoverboard prices scale monotonically across rarity tiers (50 < 100 < 180)"
  );

  // 8. Monotonic price progression within pet category
  check(
    petItems.find((i) => i.rarity === "common")!.price <
      petItems.find((i) => i.rarity === "rare")!.price &&
      petItems.find((i) => i.rarity === "rare")!.price <
        petItems.find((i) => i.rarity === "epic")!.price,
    "pet prices scale monotonically across rarity tiers (60 < 110 < 200)"
  );

  // 9. Monotonic price progression within aura category
  check(
    auraItems.find((i) => i.rarity === "common")!.price <
      auraItems.find((i) => i.rarity === "rare")!.price &&
      auraItems.find((i) => i.rarity === "rare")!.price <
        auraItems.find((i) => i.rarity === "epic")!.price,
    "aura prices scale monotonically across rarity tiers (70 < 120 < 220)"
  );

  // 10. Valid hex color codes on all items
  const validHex = (c: string) => /^#[0-9a-fA-F]{6}$/.test(c);
  check(
    ITEMS.every((i) => validHex(i.c1) && validHex(i.c2)),
    "all items define valid 6-digit hex color palettes (c1, c2)"
  );

  // 11. Descriptive blurbs on all items
  check(
    ITEMS.every((i) => typeof i.blurb === "string" && i.blurb.length > 10),
    "all items contain rich thematic lore blurbs (> 10 chars)"
  );

  // 12. cleanGear preserves valid complete loadout
  const validLoadout: Loadout = {
    hoverboard: "hb_terminal",
    pet: "pet_byte",
    aura: "aura_attention",
  };
  check(
    JSON.stringify(cleanGear(validLoadout)) === JSON.stringify(validLoadout),
    "cleanGear preserves a valid 3-slot loadout"
  );

  // 13. cleanGear eliminates invalid item IDs
  check(
    cleanGear({ hoverboard: "invalid_id" }).hoverboard === undefined,
    "cleanGear purges unregistered item IDs"
  );

  // 14. cleanGear rejects kind-slot mismatches
  check(
    cleanGear({ hoverboard: "pet_byte" }).hoverboard === undefined,
    "cleanGear rejects cross-slot category assignment (pet in hoverboard slot)"
  );

  // 15. cleanGear handles null, undefined, and non-object inputs safely
  check(
    Object.keys(cleanGear(null)).length === 0 && Object.keys(cleanGear(undefined)).length === 0,
    "cleanGear safely returns empty loadout on null/undefined input"
  );

  // 16. validatePurchase succeeds with sufficient funds
  const pSuccess = validatePurchase("hb_terminal", 100, []);
  check(
    Boolean(pSuccess.success && pSuccess.remainingTokens === 50),
    "validatePurchase succeeds when token balance exceeds item price (100 - 50 = 50)"
  );

  // 17. validatePurchase handles exact token balance
  const pExact = validatePurchase("hb_terminal", 50, []);
  check(
    Boolean(pExact.success && pExact.remainingTokens === 0),
    "validatePurchase succeeds with exact balance (50 - 50 = 0)"
  );

  // 18. validatePurchase rejects insufficient tokens
  const pShort = validatePurchase("hb_terminal", 49, []);
  check(
    !pShort.success && pShort.error === "not enough tokens yet",
    "validatePurchase rejects balance of 49 against price of 50"
  );

  // 19. validatePurchase rejects zero balance
  const pZero = validatePurchase("hb_terminal", 0, []);
  check(
    !pZero.success && pZero.error === "not enough tokens yet",
    "validatePurchase rejects 0 token balance"
  );

  // 20. validatePurchase prevents duplicate purchase of owned item
  const pOwned = validatePurchase("hb_terminal", 200, ["hb_terminal"]);
  check(
    !pOwned.success && pOwned.error === "you already own this",
    "validatePurchase rejects purchase of already owned cosmetic"
  );

  // 21. validatePurchase rejects unknown item ID
  const pUnknown = validatePurchase("non_existent_item", 500, []);
  check(
    !pUnknown.success && pUnknown.error === "unknown item",
    "validatePurchase rejects unlisted item IDs"
  );

  // 22. equipItem succeeds for owned item
  const eSuccess = equipItem({}, "hb_terminal", ["hb_terminal"]);
  check(
    Boolean(eSuccess.success && eSuccess.loadout.hoverboard === "hb_terminal"),
    "equipItem equips owned item into appropriate loadout slot"
  );

  // 23. equipItem rejects unowned item
  const eUnowned = equipItem({}, "hb_terminal", []);
  check(
    !eUnowned.success && eUnowned.error === "you do not own this yet",
    "equipItem blocks equipping an unowned cosmetic"
  );

  // 24. unequipItem cleanly removes item from slot
  const unequipped = unequipItem({ hoverboard: "hb_terminal", pet: "pet_byte" }, "hoverboard");
  check(
    unequipped.hoverboard === undefined && unequipped.pet === "pet_byte",
    "unequipItem removes target slot while preserving other equipped cosmetics"
  );

  // 25. CATALOG_ITEMS rarity-scaled tactical stats & featured flag
  const commonHb = getCatalogItem("hb_terminal");
  const rareHb = getCatalogItem("hb_gradient");
  const epicHb = getCatalogItem("hb_tensor");
  check(
    CATALOG_ITEMS.length === 9 &&
      commonHb?.stats.v1 === 85 &&
      rareHb?.stats.v1 === 89 &&
      epicHb?.stats.v1 === 98 &&
      epicHb?.featured === true &&
      commonHb?.featured === false,
    "CATALOG_ITEMS scales tactical stats by rarity (common 1.0x, rare 1.05x, epic 1.15x) and flags epics as featured"
  );

  // 26. filterCatalog multi-criteria filtering
  const filteredHoverboards = filterCatalog({ kind: "hoverboard", maxPrice: 100 });
  const filteredSearch = filterCatalog({ searchTerm: "HOLOGRAM" });
  const filteredRare = filterCatalog({ rarity: "rare" });
  const filteredPhosphor = filterCatalog({ searchTerm: "phosphor" });
  check(
    filteredHoverboards.length === 2 &&
      filteredSearch.length === 1 &&
      filteredSearch[0].id === "pet_neuron" &&
      filteredRare.length === 3 &&
      filteredPhosphor.length === 1 &&
      filteredPhosphor[0].id === "hb_terminal",
    "filterCatalog accurately filters by kind, rarity, maxPrice, and case-insensitive searchTerm"
  );

  // 27. equipItemInLoadout, unequipItemFromLoadout, toggleEquipItem & getEquippedSlots
  const eqRes1 = equipItemInLoadout({}, "hb_terminal", ["hb_terminal", "hb_tensor"]);
  const eqRes2 = equipItemInLoadout(eqRes1.loadout, "hb_tensor", ["hb_terminal", "hb_tensor"]);
  const togOff = toggleEquipItem(eqRes2.loadout, "hb_tensor", ["hb_terminal", "hb_tensor"]);
  const togOn = toggleEquipItem(togOff.loadout, "hb_terminal", ["hb_terminal", "hb_tensor"]);
  const slots = getEquippedSlots(togOn.loadout);
  const unequippedSlot = unequipItemFromLoadout(togOn.loadout, "hoverboard");
  check(
    eqRes1.success &&
      eqRes2.success &&
      eqRes2.previousItem === "hb_terminal" &&
      togOff.success &&
      !togOff.isEquipped &&
      togOn.success &&
      togOn.isEquipped &&
      slots.hoverboard?.id === "hb_terminal" &&
      slots.pet === null &&
      unequippedSlot.hoverboard === undefined,
    "loadout state machine supports equip replacement, toggleEquipItem, getEquippedSlots, and unequipItemFromLoadout"
  );

  // 28. lib/progression/index.ts re-exports catalog & loadout helpers
  check(
    indexGetCatalogItem("pet_neuron")?.id === "pet_neuron" &&
      indexEquipItemInLoadout({}, "pet_neuron", ["pet_neuron"]).success === true,
    "lib/progression/index.ts exports catalog and loadout APIs"
  );

  // 29. Prototype-chain lookup protection across catalog, validatePurchase, and loadout
  const protoKeys = ["toString", "constructor", "valueOf", "hasOwnProperty", "__proto__"];
  const protoBlocked = protoKeys.every(
    (k) =>
      getCatalogItem(k) === undefined &&
      !validatePurchase(k, 100, []).success &&
      validatePurchase(k, 100, []).error === "unknown item" &&
      !validatePurchase(k, -100, []).success &&
      validatePurchase(k, -100, []).error === "unknown item" &&
      !equipItem({}, k, [k]).success &&
      equipItem({}, k, [k]).error === "unknown item" &&
      !equipItemInLoadout({}, k, [k]).success &&
      equipItemInLoadout({}, k, [k]).error === "unknown item" &&
      !toggleEquipItem({}, k, [k]).success &&
      toggleEquipItem({}, k, [k]).error === "unknown item"
  );
  check(protoBlocked, "catalog, validatePurchase, and loadout strictly reject Object.prototype keys as unknown item");

  // =========================================================================
  // Section 2: Procedural WebAudio Synthesizer (22 checks)
  // =========================================================================
  section("platform: procedural WebAudio synthesizer");

  // 1. Headless AudioContext fallback
  check(
    getCtx() === null,
    "getCtx() safely returns null in headless Node.js environment without window"
  );

  // 2. Headless play() execution safety
  let headlessThrew = false;
  try {
    play("pop");
  } catch {
    headlessThrew = true;
  }
  check(!headlessThrew, "play() executes without throwing in headless environment");

  // 3. soundOn initial state
  check(soundOn() === true, "soundOn() defaults to enabled (true)");

  // 4. setSound master mute toggle
  setSound(false);
  const mutedCheck = soundOn() === false;
  setSound(true);
  check(mutedCheck && soundOn() === true, "setSound(true) restores audio engine");

  // Install Mock AudioContext
  const mockCtx = new MockAudioContext();
  _resetAudioContext();
  (globalThis as unknown as { window: unknown }).window = {
    AudioContext: class {
      constructor() {
        return mockCtx;
      }
    },
  };

  // 5. AudioContext auto-resume from suspended state
  play("pop");
  check(
    Boolean(mockCtx.resumed && mockCtx.state === "running"),
    "play() triggers auto-resume on suspended AudioContext"
  );

  // 6. Oscillator and Gain graph connection pipeline
  const lastOsc = mockCtx.oscillators[mockCtx.oscillators.length - 1];
  const lastGain = mockCtx.gains[mockCtx.gains.length - 1];
  check(
    Boolean(lastOsc && lastGain && lastOsc.connectedTo === lastGain && lastGain.connectedTo === mockCtx.destination),
    "audio graph routes Oscillator -> GainNode -> DestinationNode"
  );

  // 7. 'pop' SFX frequency & waveform
  mockCtx.oscillators = [];
  mockCtx.gains = [];
  play("pop");
  check(
    mockCtx.oscillators.length === 1 &&
      mockCtx.oscillators[0].frequency.value === 660 &&
      mockCtx.oscillators[0].type === "triangle",
    "'pop' generates 1 triangle oscillator at 660 Hz"
  );

  // 8. 'notify' SFX two-tone sequence
  mockCtx.oscillators = [];
  play("notify");
  check(
    mockCtx.oscillators.length === 2 &&
      mockCtx.oscillators[0].frequency.value === 880 &&
      mockCtx.oscillators[1].frequency.value === 1175,
    "'notify' generates 2-tone sine sequence at 880 Hz and 1175 Hz"
  );

  // 9. 'win' 4-tone victory chord
  mockCtx.oscillators = [];
  play("win");
  const winFreqs = mockCtx.oscillators.map((o) => o.frequency.value);
  check(
    winFreqs.length === 4 && JSON.stringify(winFreqs) === JSON.stringify([523, 659, 784, 1047]),
    "'win' generates 4-tone victory chord [523, 659, 784, 1047] Hz"
  );

  // 10. 'win' waveform assignment
  check(
    mockCtx.oscillators.every((o) => o.type === "triangle"),
    "'win' chord utilizes warm triangle waveforms"
  );

  // 11. 'lose' SFX low-frequency sawtooth tones
  mockCtx.oscillators = [];
  play("lose");
  const loseFreqs = mockCtx.oscillators.map((o) => o.frequency.value);
  check(
    loseFreqs.length === 2 &&
      loseFreqs[0] === 330 &&
      loseFreqs[1] === 247 &&
      mockCtx.oscillators[0].type === "sawtooth",
    "'lose' generates 2 descending sawtooth tones at 330 Hz and 247 Hz"
  );

  // 12. 'tick' UI click frequency
  mockCtx.oscillators = [];
  play("tick");
  check(
    mockCtx.oscillators.length === 1 && mockCtx.oscillators[0].frequency.value === 1200,
    "'tick' generates ultra-short 1200 Hz sine ping"
  );

  // 13. 'go' start trigger frequencies
  mockCtx.oscillators = [];
  play("go");
  check(
    mockCtx.oscillators.length === 2 &&
      mockCtx.oscillators[0].frequency.value === 440 &&
      mockCtx.oscillators[1].frequency.value === 880,
    "'go' generates 440 Hz -> 880 Hz upward octave leap"
  );

  // 14. 'roll' dice rumble triad
  mockCtx.oscillators = [];
  play("roll");
  const rollFreqs = mockCtx.oscillators.map((o) => o.frequency.value);
  check(
    rollFreqs.length === 3 && JSON.stringify(rollFreqs) === JSON.stringify([300, 450, 600]),
    "'roll' generates 3-stage mechanical dice rumble [300, 450, 600] Hz"
  );

  // 15. 'wave' ambient chime
  mockCtx.oscillators = [];
  play("wave");
  const waveFreqs = mockCtx.oscillators.map((o) => o.frequency.value);
  check(
    waveFreqs.length === 3 && JSON.stringify(waveFreqs) === JSON.stringify([587, 740, 880]),
    "'wave' generates major chime triad [587, 740, 880] Hz"
  );

  // 16. 'teleport' warp sweep
  mockCtx.oscillators = [];
  play("teleport");
  const tpFreqs = mockCtx.oscillators.map((o) => o.frequency.value);
  check(
    tpFreqs.length === 4 && JSON.stringify(tpFreqs) === JSON.stringify([220, 440, 880, 1760]),
    "'teleport' generates 4-octave ascending quantum sweep [220, 440, 880, 1760] Hz"
  );

  // 17. 'level' level-up fanfare
  mockCtx.oscillators = [];
  play("level");
  const lvlFreqs = mockCtx.oscillators.map((o) => o.frequency.value);
  check(
    lvlFreqs.length === 5 && JSON.stringify(lvlFreqs) === JSON.stringify([440, 554, 659, 880, 1108]),
    "'level' generates 5-note fanfare [440, 554, 659, 880, 1108] Hz"
  );

  // 18. 'hover' micro-haptic feedback
  mockCtx.oscillators = [];
  play("hover");
  check(
    mockCtx.oscillators.length === 1 && mockCtx.oscillators[0].frequency.value === 1400,
    "'hover' generates delicate 1400 Hz micro-blip"
  );

  // 19. Envelope attack ramp timing (15ms attack)
  mockCtx.oscillators = [];
  mockCtx.gains = [];
  play("pop");
  const popGain = mockCtx.gains[0];
  const attackEv = popGain?.gain.events.find((e) => e.type === "exponentialRamp");
  check(
    Boolean(attackEv && near(attackEv.time, 0.015)),
    "gain envelope features 15ms exponential attack curve (t0 + 0.015)"
  );

  // 20. Envelope release duration
  const releaseEv = popGain?.gain.events.filter((e) => e.type === "exponentialRamp")[1];
  check(
    Boolean(releaseEv && near(releaseEv.time, 0.09) && releaseEv.value === 0.0001),
    "gain envelope decays to 0.0001 at target sound duration"
  );

  // 21. Oscillator stop click-prevention buffer (dur + 50ms)
  const popOsc = mockCtx.oscillators[0];
  check(
    Boolean(popOsc && popOsc.stoppedAt !== null && near(popOsc.stoppedAt, 0.14)),
    "oscillator stop includes 50ms post-release buffer to eliminate DC offset clicks"
  );

  // 22. Master mute strictly suppresses sound generation across play(), tone(), toneADSR(), and noise()
  setSound(false);
  mockCtx.oscillators = [];
  mockCtx.gains = [];
  mockCtx.bufferSources = [];
  play("win");
  tone(440, 0, 0.1);
  toneADSR(440, 0, { attack: 0.01, decay: 0.05, sustain: 0.5, release: 0.05, peakGain: 0.1 });
  noise(0, 0.1);
  check(
    mockCtx.oscillators.length === 0 && mockCtx.gains.length === 0 && mockCtx.bufferSources.length === 0,
    "when sound is muted, play(), tone(), toneADSR(), and noise() create zero WebAudio nodes"
  );
  setSound(true);

  // 23. Master & channel volume clamping (getVolume, setVolume, getChannelVolume, setChannelVolume)
  setVolume(-5);
  const vMin = getVolume();
  setVolume(5);
  const vMax = getVolume();
  setVolume(NaN);
  const vNan = getVolume();
  setVolume(0.8);
  setChannelVolume("sfx", -1);
  const chMin = getChannelVolume("sfx");
  setChannelVolume("sfx", 2.5);
  const chMax = getChannelVolume("sfx");
  setChannelVolume("sfx", NaN);
  const chNan = getChannelVolume("sfx");
  setChannelVolume("sfx", 0.8);
  check(
    vMin === 0 && vMax === 1 && vNan === 0.8 && chMin === 0 && chMax === 1 && chNan === 1,
    "setVolume and setChannelVolume clamp values to [0, 1] and guard against NaN"
  );

  // 24. toneADSR generates 4-stage monotonic envelope ramps
  mockCtx.oscillators = [];
  mockCtx.gains = [];
  toneADSR(523, 0, { attack: 0.01, decay: 0.04, sustain: 0.4, release: 0.08, peakGain: 0.1 }, "triangle", "sfx");
  const adsrGain = mockCtx.gains[0];
  const adsrRamps = adsrGain?.gain.events.filter((e) => e.type === "exponentialRamp") ?? [];
  check(
    mockCtx.oscillators.length === 1 &&
      adsrRamps.length === 3 &&
      adsrRamps[0].time < adsrRamps[1].time &&
      adsrRamps[1].time < adsrRamps[2].time &&
      adsrRamps[2].value === 0.0001,
    "toneADSR schedules strictly ordered attack -> decay -> release exponential ramps"
  );

  // 25. noise() creates bandpass-filtered white noise buffer in [-1, 1]
  mockCtx.bufferSources = [];
  mockCtx.filters = [];
  mockCtx.gains = [];
  noise(0, 0.08, 1600, 0.06, "sfx");
  const noiseSrc = mockCtx.bufferSources[0];
  const noiseFilter = mockCtx.filters[0];
  const noiseGain = mockCtx.gains[0];
  const samples = noiseSrc?.buffer?.getChannelData(0);
  const samplesValid = Boolean(samples && samples.length > 0 && samples.every((s) => s >= -1 && s <= 1));
  check(
    Boolean(
      noiseSrc &&
        noiseFilter &&
        noiseGain &&
        noiseFilter.type === "bandpass" &&
        noiseFilter.frequency.value === 1600 &&
        noiseSrc.connectedTo === noiseFilter &&
        noiseFilter.connectedTo === noiseGain &&
        noiseGain.connectedTo === mockCtx.destination &&
        samplesValid
    ),
    "noise() generates normalized [-1, 1] white noise routed AudioBufferSource -> BiquadFilter -> Gain -> Destination"
  );

  // 26. All 29 Sfx presets emit audio nodes cleanly
  const allPresets: Sfx[] = [
    "pop", "notify", "win", "lose", "tick", "go", "roll", "wave", "teleport", "level", "hover",
    "click", "modal_open", "tab_switch",
    "badge_unlock", "purchase_success", "purchase_fail",
    "chat_ping",
    "dice_roll", "dice_double", "dice_jackpot",
    "quiz_correct", "quiz_wrong",
    "warp_charge", "nitro_boost",
    "cipher_click", "matrix_unlock",
    "speedrun_pass", "speedrun_fail",
  ];
  const presetCounts = allPresets.map((preset) => {
    mockCtx.oscillators = [];
    play(preset);
    return mockCtx.oscillators.length;
  });
  check(
    allPresets.length === 29 && presetCounts.every((c) => c >= 1) && typeof useSound === "function",
    "all 29 Sfx presets emit oscillators and useSound hook is exported"
  );

  // 27. Ultra-short tone duration clamps attack strictly before decay
  mockCtx.oscillators = [];
  mockCtx.gains = [];
  tone(880, 0, 0.005);
  const shortRamps = mockCtx.gains[0]?.gain.events.filter((e) => e.type === "exponentialRamp") ?? [];
  check(
    shortRamps.length === 2 && shortRamps[0].time < shortRamps[1].time && near(shortRamps[1].time, 0.005),
    "tone() clamps attack time on ultra-short durations (< 15ms) so attack never follows decay"
  );

  // 28. Rejected AudioContext.resume() does not leak unhandled promise rejections
  let unhandledRejections = 0;
  const onUnhandled = () => {
    unhandledRejections++;
  };
  process.on("unhandledRejection", onUnhandled);
  mockCtx.state = "suspended";
  mockCtx.rejectResume = true;
  play("pop");
  await new Promise((r) => setTimeout(r, 15));
  process.off("unhandledRejection", onUnhandled);
  mockCtx.rejectResume = false;
  mockCtx.state = "running";
  check(
    unhandledRejections === 0,
    "ac() catches rejected AudioContext.resume() promises without unhandled rejections"
  );

  // 29. Domain guards: tone() and noise() ignore invalid dur/start/freq without creating nodes
  mockCtx.oscillators = [];
  mockCtx.gains = [];
  mockCtx.bufferSources = [];
  let invalidAudioThrew = false;
  try {
    for (const badDur of [0, -1, -0.01, NaN, Infinity, -Infinity]) {
      tone(440, 0, badDur);
      noise(0, badDur);
    }
    tone(0, 0, 0.1);
    tone(-440, 0, 0.1);
    tone(NaN, 0, 0.1);
    tone(Infinity, 0, 0.1);
    tone(440, -0.1, 0.1);
    tone(440, NaN, 0.1);
    noise(-0.1, 0.1);
    noise(NaN, 0.1);
  } catch {
    invalidAudioThrew = true;
  }
  check(
    !invalidAudioThrew &&
      mockCtx.oscillators.length === 0 &&
      mockCtx.gains.length === 0 &&
      mockCtx.bufferSources.length === 0,
    "tone() and noise() guard against zero/negative/NaN/Infinity dur, start, and freq without allocating nodes"
  );

  // 30. Sub-millisecond positive durations maintain 0 < attack < dur and stop > start
  mockCtx.oscillators = [];
  mockCtx.gains = [];
  mockCtx.bufferSources = [];
  tone(440, 0, 0.0005);
  tone(440, 0, 0.001);
  noise(0, 0.0005);
  const subMsTone0 = mockCtx.gains[0]?.gain.events.filter((e) => e.type === "exponentialRamp") ?? [];
  const subMsTone1 = mockCtx.gains[1]?.gain.events.filter((e) => e.type === "exponentialRamp") ?? [];
  const subMsNoise = mockCtx.gains[2]?.gain.events.filter((e) => e.type === "exponentialRamp") ?? [];
  check(
    subMsTone0.length === 2 &&
      subMsTone0[0].time > 0 &&
      subMsTone0[0].time < subMsTone0[1].time &&
      near(subMsTone0[1].time, 0.0005) &&
      (mockCtx.oscillators[0]?.stoppedAt ?? 0) > (mockCtx.oscillators[0]?.startedAt ?? 0) &&
      subMsTone1.length === 2 &&
      subMsTone1[0].time > 0 &&
      subMsTone1[0].time < subMsTone1[1].time &&
      subMsNoise.length === 2 &&
      subMsNoise[0].time > 0 &&
      subMsNoise[0].time < subMsNoise[1].time &&
      (mockCtx.bufferSources[0]?.stoppedAt ?? 0) > (mockCtx.bufferSources[0]?.startedAt ?? 0),
    "tone() and noise() preserve strict 0 < attack < dur and stop > start for sub-millisecond durations"
  );

  // 31. toneADSR() clamps zero/negative/NaN segments and keeps gain targets strictly positive
  mockCtx.oscillators = [];
  mockCtx.gains = [];
  toneADSR(440, 0, { attack: 0, decay: 0, sustain: 0.5, release: 0, peakGain: 0.1 });
  toneADSR(440, 0, { attack: -0.1, decay: -0.05, sustain: -0.2, release: -0.02, peakGain: 0.1 });
  setVolume(0);
  toneADSR(440, 0, { attack: NaN, decay: NaN, sustain: 0, release: NaN, peakGain: 0 });
  setVolume(0.8);
  const adsrCasesValid =
    mockCtx.oscillators.length === 3 &&
    mockCtx.gains.every((gNode, idx) => {
      const ramps = gNode.gain.events.filter((e) => e.type === "exponentialRamp");
      const osc = mockCtx.oscillators[idx];
      return (
        ramps.length === 3 &&
        ramps[0].time > 0 &&
        ramps[0].time < ramps[1].time &&
        ramps[1].time < ramps[2].time &&
        ramps.every((r) => Number.isFinite(r.value) && r.value > 0) &&
        osc.stoppedAt !== null &&
        osc.startedAt !== null &&
        osc.stoppedAt > ramps[2].time &&
        osc.stoppedAt > osc.startedAt
      );
    });
  check(
    adsrCasesValid,
    "toneADSR() clamps zero/negative/NaN segments and enforces strictly increasing ramps and positive gain targets"
  );

  // 32. toneADSR() guards invalid freq and start
  mockCtx.oscillators = [];
  mockCtx.gains = [];
  toneADSR(0, 0, { attack: 0.01, decay: 0.02, sustain: 0.5, release: 0.03, peakGain: 0.1 });
  toneADSR(-440, 0, { attack: 0.01, decay: 0.02, sustain: 0.5, release: 0.03, peakGain: 0.1 });
  toneADSR(NaN, 0, { attack: 0.01, decay: 0.02, sustain: 0.5, release: 0.03, peakGain: 0.1 });
  toneADSR(440, -1, { attack: 0.01, decay: 0.02, sustain: 0.5, release: 0.03, peakGain: 0.1 });
  toneADSR(440, Infinity, { attack: 0.01, decay: 0.02, sustain: 0.5, release: 0.03, peakGain: 0.1 });
  check(
    mockCtx.oscillators.length === 0 && mockCtx.gains.length === 0,
    "toneADSR() guards invalid frequency and start times without creating nodes"
  );

  // Cleanup mock
  delete (globalThis as unknown as { window?: unknown }).window;
  _resetAudioContext();

  // =========================================================================
  // Section 3: Admin Platform Operations & Moderation HUD (22 checks)
  // =========================================================================
  section("platform: admin operations & moderation HUD");

  // 1. computeHealth probe enumeration
  const emptyHealth = computeHealth({});
  check(emptyHealth.length === 4, "computeHealth returns exactly 4 core subsystem probes");

  // 2. Supabase required status
  check(
    emptyHealth.find((c) => c.id === "supabase")?.required === true,
    "Supabase probe is flagged as strictly required for live multiplayer"
  );

  // 3. Platform readiness gate with empty config
  check(isReady(emptyHealth) === false, "isReady returns false when required services are missing");

  // 4. Platform readiness with valid Supabase config
  const supaReady = computeHealth({
    NEXT_PUBLIC_SUPABASE_URL: "https://xyz.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "pub_key",
  });
  check(
    isReady(supaReady) === true,
    "isReady returns true when Supabase URL and publishable key are configured"
  );

  // 5. Legacy anon key support
  const supaLegacy = computeHealth({
    NEXT_PUBLIC_SUPABASE_URL: "https://xyz.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon_key",
  });
  check(
    isReady(supaLegacy) === true,
    "computeHealth accepts legacy NEXT_PUBLIC_SUPABASE_ANON_KEY as valid"
  );

  // 6. LiveKit incomplete configuration detection
  const lkPartial = computeHealth({ LIVEKIT_URL: "wss://livekit.barmo.gg" });
  check(
    Boolean(
      lkPartial.find((c) => c.id === "livekit")?.ok === false &&
        lkPartial.find((c) => c.id === "livekit")?.detail.includes("Partly set")
    ),
    "LiveKit probe reports 'Partly set' when only URL is provided without keys"
  );

  // 7. LiveKit complete configuration
  const lkComplete = computeHealth({
    LIVEKIT_URL: "wss://lk.barmo.gg",
    LIVEKIT_API_KEY: "api_key",
    LIVEKIT_API_SECRET: "secret",
  });
  check(
    Boolean(
      lkComplete.find((c) => c.id === "livekit")?.ok === true &&
        lkComplete.find((c) => c.id === "livekit")?.detail === "Connected."
    ),
    "LiveKit probe activates when URL, API key, and secret are all supplied"
  );

  // 8. AI provider: OpenRouter detection
  const aiOpenRouter = computeHealth({ OPENROUTER_API_KEY: "sk-or-test" });
  check(
    aiOpenRouter.find((c) => c.id === "ai")?.detail.includes("OpenRouter") === true,
    "AI probe correctly detects OpenRouter provider"
  );

  // 9. AI provider: Anthropic detection
  const aiAnthropic = computeHealth({ ANTHROPIC_API_KEY: "sk-ant-test" });
  check(
    aiAnthropic.find((c) => c.id === "ai")?.detail.includes("Anthropic") === true,
    "AI probe correctly detects Anthropic provider"
  );

  // 10. AI model name reflection
  const aiModel = computeHealth({
    OPENROUTER_API_KEY: "sk-or-test",
    NOVA_MODEL: "anthropic/claude-3.5-sonnet",
  });
  check(
    aiModel.find((c) => c.id === "ai")?.detail.includes("model anthropic/claude-3.5-sonnet") === true,
    "AI probe surfaces NOVA_MODEL in telemetry details"
  );

  // 11. Insecure HTTP webhook rejection
  const reportHttp = computeHealth({ REPORT_WEBHOOK_URL: "http://insecure.webhook.com" });
  check(
    reportHttp.find((c) => c.id === "reports")?.ok === false,
    "reports probe rejects insecure plaintext HTTP webhooks"
  );

  // 12. Secure HTTPS webhook acceptance
  const reportHttps = computeHealth({
    REPORT_WEBHOOK_URL: "https://discord.com/api/webhooks/xyz",
  });
  check(
    reportHttps.find((c) => c.id === "reports")?.ok === true,
    "reports probe accepts valid HTTPS webhook URLs"
  );

  // 13. Zero secret token leakage in diagnostic output
  const telemetryDump = JSON.stringify(
    computeHealth({
      NEXT_PUBLIC_SUPABASE_URL: "https://supa.barmo.gg",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "SUPER_SECRET_SUPABASE_KEY_999",
      LIVEKIT_API_SECRET: "SUPER_SECRET_LIVEKIT_SECRET_888",
      OPENROUTER_API_KEY: "SUPER_SECRET_OPENROUTER_777",
    })
  );
  check(
    !telemetryDump.includes("SUPER_SECRET_SUPABASE_KEY_999") &&
      !telemetryDump.includes("SUPER_SECRET_LIVEKIT_SECRET_888") &&
      !telemetryDump.includes("SUPER_SECRET_OPENROUTER_777"),
    "security invariant: computeHealth never leaks secret tokens into client telemetry"
  );

  // 14. Moderation state: default active user permissions
  const modSystem = new ModerationEngine();
  check(
    Boolean(modSystem.canUserChat("user_1") && modSystem.canUserJoinWorld("user_1")),
    "active user possesses standard chat and world join permissions"
  );

  // 15. User mute enforcement
  modSystem.muteUser("user_1", "mod_admin", "Spamming lounge chat", 60_000);
  check(
    Boolean(!modSystem.canUserChat("user_1") && modSystem.canUserJoinWorld("user_1")),
    "muted user is restricted from chatting while retaining world navigation permissions"
  );

  // 16. User ban enforcement
  modSystem.banUser("user_2", "mod_admin", "Severe terms violation");
  check(
    Boolean(!modSystem.canUserChat("user_2") && !modSystem.canUserJoinWorld("user_2")),
    "banned user is denied both chat access and 3D world access"
  );

  // 17. User unban restoration
  modSystem.unbanUser("user_2", "mod_admin", "Appeal granted");
  check(
    Boolean(modSystem.canUserChat("user_2") && modSystem.canUserJoinWorld("user_2")),
    "unbanning a user fully restores chat and world join permissions"
  );

  // 18. Temporary mute auto-expiration
  modSystem.muteUser("user_3", "mod_admin", "Short timeout", 50); // 50ms mute
  await new Promise((r) => setTimeout(r, 60));
  check(
    modSystem.canUserChat("user_3"),
    "temporary mute automatically lifts when duration expires"
  );

  // 19. Self-moderation prevention
  const selfMute = modSystem.muteUser("mod_admin", "mod_admin", "Self mute");
  check(
    Boolean(!selfMute.success && selfMute.error === "cannot moderate self"),
    "moderators are blocked from moderating their own account"
  );

  // 20. Audit log entry generation
  const lastAudit = modSystem.getAuditLogs().slice(-1)[0];
  check(
    Boolean(lastAudit && lastAudit.moderatorId === "mod_admin" && lastAudit.targetId === "user_3"),
    "moderation actions automatically generate structured audit log entries"
  );

  // 21. Audit log query filtering by action
  const muteLogs = modSystem.filterAuditLogs({ action: "mute" });
  check(
    Boolean(muteLogs.length >= 2 && muteLogs.every((l) => l.action === "mute")),
    "filterAuditLogs correctly isolates entries by moderation action"
  );

  // 22. Audit log query filtering by target
  const user1Logs = modSystem.filterAuditLogs({ targetId: "user_1" });
  check(
    Boolean(user1Logs.length === 1 && user1Logs[0].targetId === "user_1"),
    "filterAuditLogs correctly isolates entries by target user ID"
  );

  // 23. RBAC role permission matrix (lib/admin/roles.ts)
  const allPerms: AdminPermission[] = [
    "diagnostics:view",
    "moderation:mute",
    "moderation:kick",
    "moderation:ban",
    "broadcast:send",
    "audit:read",
    "audit:export",
  ];
  check(
    allPerms.every((p) => hasPermission("admin", p)) &&
      hasPermission("moderator", "diagnostics:view") &&
      hasPermission("moderator", "moderation:mute") &&
      hasPermission("moderator", "moderation:kick") &&
      hasPermission("moderator", "audit:read") &&
      !hasPermission("moderator", "moderation:ban") &&
      !hasPermission("moderator", "broadcast:send") &&
      !hasPermission("moderator", "audit:export") &&
      allPerms.every((p) => !hasPermission("player", p) && !hasPermission("guest", p)) &&
      !hasPermission("unknown_role" as PlatformRole, "diagnostics:view") &&
      ROLE_PERMISSIONS.admin.length === 7,
    "hasPermission enforces strict RBAC across admin, moderator, player, guest, and unknown roles"
  );

  // 24. probePlatformHealth telemetry & zero-secret invariant (lib/admin/telemetry.ts)
  const prevEnv = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    LIVEKIT_URL: process.env.LIVEKIT_URL,
    LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  };
  let probeReport;
  let probeJson = "";
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://probe.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "PROBE_SECRET_SUPA_111";
    process.env.LIVEKIT_URL = "wss://lk.barmo.gg";
    process.env.LIVEKIT_API_KEY = "PROBE_SECRET_LK_KEY_222";
    process.env.LIVEKIT_API_SECRET = "PROBE_SECRET_LK_SEC_333";
    process.env.OPENROUTER_API_KEY = "PROBE_SECRET_OR_444";
    probeReport = await probePlatformHealth();
    probeJson = JSON.stringify(probeReport);
  } finally {
    for (const [k, v] of Object.entries(prevEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
  check(
    Boolean(
      probeReport &&
        probeReport.services.length === 4 &&
        probeReport.overall === "healthy" &&
        probeReport.services.every((s) => s.status === "operational") &&
        !probeJson.includes("PROBE_SECRET_SUPA_111") &&
        !probeJson.includes("PROBE_SECRET_LK_KEY_222") &&
        !probeJson.includes("PROBE_SECRET_LK_SEC_333") &&
        !probeJson.includes("PROBE_SECRET_OR_444")
    ),
    "probePlatformHealth verifies all 4 services as operational when configured and leaks zero secrets"
  );

  // 25. Persistent audit store (lib/admin/audit.ts): record, filter, export, clone & 1000-entry retention
  clearAuditLogs();
  const sampleEntry = {
    id: "audit_test_1",
    action: "warn" as const,
    targetId: "user_audit_1",
    moderatorId: "mod_audit",
    reason: "Original reason",
    timestamp: Date.now(),
    metadata: { sector: "lounge" },
  };
  recordAuditEvent(sampleEntry);
  sampleEntry.reason = "Caller mutated original";
  const fetchedAudit = getAuditLogs({ targetId: "user_audit_1" });
  fetchedAudit[0].reason = "Caller mutated fetched";
  if (fetchedAudit[0].metadata) fetchedAudit[0].metadata.sector = "hacked";
  const refetchedAudit = getAuditLogs({ targetId: "user_audit_1" });
  const exportedAuditJson = exportAuditLogsJson();
  clearAuditLogs();
  for (let i = 0; i < 1000; i++) {
    recordAuditEvent({
      id: `bulk_${i}`,
      action: "kick",
      targetId: `u_${i}`,
      moderatorId: "mod_bulk",
      reason: "Bulk retention check",
      timestamp: 1000 + i,
    });
  }
  const bulkLogs = getAuditLogs();
  clearAuditLogs();
  check(
    refetchedAudit.length === 1 &&
      refetchedAudit[0].reason === "Original reason" &&
      refetchedAudit[0].metadata?.sector === "lounge" &&
      exportedAuditJson.includes("audit_test_1") &&
      bulkLogs.length === 1000 &&
      bulkLogs[0].id === "bulk_0" &&
      bulkLogs[999].id === "bulk_999",
    "lib/admin/audit.ts deep-clones audit entries, exports JSON, and retains up to 1,000 events"
  );

  // 26. ModerationEngine edge cases: durationMs=0 rejection, whitespace self-mod, expired re-ban, deep-clone
  const edgeMod = new ModerationEngine();
  const zeroDurMute = edgeMod.muteUser("u_edge", "mod_edge", "Zero duration", 0);
  const negDurBan = edgeMod.banUser("u_edge", "mod_edge", "Negative duration", -50);
  const nanDurMute = edgeMod.muteUser("u_edge", "mod_edge", "NaN duration", NaN);
  const trimmedSelfMute = edgeMod.muteUser("mod_edge ", " mod_edge", "Whitespace self-mod");
  const emptyTargetKick = edgeMod.kickUser("   ", "mod_edge", "Empty target");
  edgeMod.banUser("u_reban", "mod_edge", "Short ban", 10);
  await new Promise((r) => setTimeout(r, 25));
  const rebanAfterExpiry = edgeMod.banUser("u_reban", "mod_edge", "Re-ban after expiry", 5000);
  const engineLogsBeforeMut = edgeMod.getAuditLogs();
  engineLogsBeforeMut[0].reason = "TAMPERED_REASON";
  const filteredBeforeMut = edgeMod.filterAuditLogs({ targetId: "u_reban" });
  filteredBeforeMut[0].reason = "TAMPERED_FILTERED";
  const engineLogsAfterMut = edgeMod.getAuditLogs();
  check(
    !zeroDurMute.success &&
      zeroDurMute.error === "invalid duration" &&
      !negDurBan.success &&
      negDurBan.error === "invalid duration" &&
      !nanDurMute.success &&
      nanDurMute.error === "invalid duration" &&
      !trimmedSelfMute.success &&
      trimmedSelfMute.error === "cannot moderate self" &&
      !emptyTargetKick.success &&
      emptyTargetKick.error === "target and moderator IDs are required" &&
      rebanAfterExpiry.success &&
      engineLogsAfterMut[0].reason === "Short ban" &&
      engineLogsAfterMut[1].reason === "Re-ban after expiry",
    "ModerationEngine rejects invalid durations (0/neg/NaN), enforces trimmed/non-empty IDs, prunes expired bans on re-ban, and deep-clones audit logs"
  );

  // 27. RBAC prototype-key hardening (lib/admin/roles.ts)
  const protoRoleKeys = ["toString", "constructor", "__proto__", "valueOf", "hasOwnProperty"];
  let protoRoleThrew = false;
  let protoRoleAllowed = false;
  try {
    for (const rk of protoRoleKeys) {
      if (hasPermission(rk as PlatformRole, "diagnostics:view")) {
        protoRoleAllowed = true;
      }
    }
  } catch {
    protoRoleThrew = true;
  }
  check(
    !protoRoleThrew && !protoRoleAllowed && Object.getPrototypeOf(ROLE_PERMISSIONS) === null,
    "hasPermission safely returns false on Object.prototype keys and ROLE_PERMISSIONS uses a null prototype"
  );

  // 28. unbanUser and unmuteUser reject self-moderation
  const selfUnEngine = new ModerationEngine();
  selfUnEngine.banUser("u_self_unban", "mod_other", "Initial ban");
  selfUnEngine.muteUser("u_self_unmute", "mod_other", "Initial mute");
  const selfUnban = selfUnEngine.unbanUser("u_self_unban", "u_self_unban", "Self unban");
  const selfUnbanWs = selfUnEngine.unbanUser(" u_self_unban ", "u_self_unban\t", "Self unban ws");
  const selfUnmute = selfUnEngine.unmuteUser("u_self_unmute", "u_self_unmute", "Self unmute");
  check(
    !selfUnban.success &&
      selfUnban.error === "cannot moderate self" &&
      !selfUnbanWs.success &&
      selfUnbanWs.error === "cannot moderate self" &&
      !selfUnmute.success &&
      selfUnmute.error === "cannot moderate self" &&
      !selfUnEngine.canUserJoinWorld("u_self_unban") &&
      !selfUnEngine.canUserChat("u_self_unmute"),
    "unbanUser and unmuteUser reject self-moderation without lifting active sanctions"
  );

  // 29. Whitespace-padded ID normalization in canUserChat and canUserJoinWorld
  const padMod = new ModerationEngine();
  padMod.banUser("  badactor  ", "mod_1", "Ban padded target");
  padMod.muteUser("  noisyactor  ", "mod_1", "Mute padded target");
  check(
    !padMod.canUserJoinWorld("badactor") &&
      !padMod.canUserJoinWorld("  badactor  ") &&
      !padMod.canUserChat("  badactor  ") &&
      !padMod.canUserChat("noisyactor") &&
      !padMod.canUserChat("  noisyactor\t"),
    "canUserChat and canUserJoinWorld trim userId so padded IDs cannot bypass bans or mutes"
  );

  // 30. Deep metadata immutability in recordAuditEvent and ModerationEngine
  clearAuditLogs();
  const nestedSource = {
    id: "audit_nested_1",
    action: "warn" as const,
    targetId: "u_nest",
    moderatorId: "mod_nest",
    reason: "Nested metadata test",
    timestamp: Date.now(),
    metadata: {
      evidence: ["msg1"],
      actor: { ip: "10.0.0.1" },
    },
  };
  recordAuditEvent(nestedSource);
  nestedSource.metadata.evidence.push("CALLER_TAMPERED");
  nestedSource.metadata.actor.ip = "999.999.999.999";
  const fetchedNested = getAuditLogs({ targetId: "u_nest" });
  const fetchedMeta = fetchedNested[0]?.metadata as { evidence: string[]; actor: { ip: string } } | undefined;
  fetchedMeta?.evidence.push("FETCHER_TAMPERED");
  if (fetchedMeta?.actor) fetchedMeta.actor.ip = "1.1.1.1";
  const refetchedNested = getAuditLogs({ targetId: "u_nest" });
  const storedMeta = refetchedNested[0]?.metadata as { evidence: string[]; actor: { ip: string } } | undefined;
  clearAuditLogs();

  // Also test ModerationEngine cloneAuditEntry isolation on return & query
  const deepMod = new ModerationEngine();
  const deepRes = deepMod.warnUser("u_deep", "mod_deep", "Deep warn");
  if (deepRes.entry) deepRes.entry.reason = "TAMPERED_RETURN";
  const rawInternalEntry = deepMod.getAuditLogs()[0];
  rawInternalEntry.reason = "TAMPERED_GET";
  const refetchedDeepEntry = deepMod.getAuditLogs()[0];
  check(
    storedMeta?.evidence.length === 1 &&
      storedMeta.evidence[0] === "msg1" &&
      storedMeta.actor.ip === "10.0.0.1" &&
      deepRes.success &&
      rawInternalEntry.id === deepRes.entry?.id &&
      refetchedDeepEntry.reason === "Deep warn",
    "recordAuditEvent and getAuditLogs deep-clone nested metadata objects and arrays"
  );

  // 31. warnUser() functionality, validation, and 1000-entry retention cap in ModerationEngine
  const warnMod = new ModerationEngine();
  const warnEmpty = warnMod.warnUser("   ", "mod_1", "Empty target");
  const warnSelf = warnMod.warnUser("mod_1", " mod_1 ", "Self warn");
  const warnOk = warnMod.warnUser(" u_warned ", " mod_1 ", "");
  const warnLogs = warnMod.filterAuditLogs({ action: "warn", targetId: "u_warned" });
  const capMod = new ModerationEngine();
  for (let i = 0; i < 1100; i++) {
    capMod.warnUser(`u_cap_${i}`, "mod_cap", `Warning #${i}`);
  }
  const cappedLogs = capMod.getAuditLogs();
  check(
    !warnEmpty.success &&
      warnEmpty.error === "target and moderator IDs are required" &&
      !warnSelf.success &&
      warnSelf.error === "cannot moderate self" &&
      warnOk.success &&
      warnOk.entry?.action === "warn" &&
      warnOk.entry?.targetId === "u_warned" &&
      warnOk.entry?.moderatorId === "mod_1" &&
      warnOk.entry?.reason === "No reason provided" &&
      warnLogs.length === 1 &&
      cappedLogs.length === 1000 &&
      cappedLogs[0].targetId === "u_cap_100" &&
      cappedLogs[999].targetId === "u_cap_1099",
    "ModerationEngine.warnUser validates IDs, blocks self-warn, logs warn entries, and caps auditLog at 1000 entries"
  );

  // =========================================================================
  // Section 4: Production Deployment & SEO (22 checks)
  // =========================================================================
  section("platform: production deployment, PWA & SEO metadata");

  // 1. PWA Manifest generation
  const pwa = manifest();
  check(typeof pwa === "object" && pwa !== null, "manifest() returns a valid Web App Manifest object");

  // 2. PWA name and branding
  check(pwa.name === "BARMO" && pwa.short_name === "BARMO", "manifest defines application name and short_name as BARMO");

  // 3. PWA standalone display mode
  check(pwa.display === "standalone", "manifest specifies display: standalone for native app-like mobile experience");

  // 4. PWA launch routing
  check(pwa.start_url === "/" && pwa.scope === "/", "manifest configures start_url and scope to root '/'");

  // 5. PWA dark theme palette
  check(
    pwa.theme_color === "#12151f" && pwa.background_color === "#12151f",
    "manifest defines dark cyber theme and background colors"
  );

  // 6. PWA shortcuts count
  check(Array.isArray(pwa.shortcuts) && pwa.shortcuts.length === 3, "manifest registers exactly 3 quick-launch room shortcuts");

  // 7. PWA Meeting Hall shortcut URL
  check(
    Boolean(pwa.shortcuts?.some((s) => s.name === "Meeting Hall" && s.url === "/world?room=meeting")),
    "shortcuts include Meeting Hall deep-link"
  );

  // 8. PWA Party Hall shortcut URL
  check(
    Boolean(pwa.shortcuts?.some((s) => s.name === "Party Hall" && s.url === "/world?room=party")),
    "shortcuts include Party Hall deep-link"
  );

  // 9. PWA AI Lab shortcut URL
  check(
    Boolean(pwa.shortcuts?.some((s) => s.name === "AI Lab" && s.url === "/world?room=lab")),
    "shortcuts include AI Lab deep-link"
  );

  // 10. PWA 192x192 icon registration
  check(
    Boolean(pwa.icons?.some((i) => i.sizes === "192x192" && i.purpose === "any")),
    "manifest provides 192x192 PNG icon for mobile home screens"
  );

  // 11. PWA 512x512 high-resolution icon
  check(
    Boolean(pwa.icons?.some((i) => i.sizes === "512x512" && i.purpose === "any")),
    "manifest provides 512x512 high-res splash icon"
  );

  // 12. PWA 512x512 maskable icon for Android adaptive icons
  check(
    Boolean(pwa.icons?.some((i) => i.sizes === "512x512" && i.purpose === "maskable")),
    "manifest provides 512x512 maskable icon for Android adaptive launcher icons"
  );

  // 13. Robots directive object
  const rob = robots();
  check(typeof rob === "object" && rob !== null, "robots() returns valid Next.js MetadataRoute.Robots object");

  // 14. Robots wildcard crawler permission
  check(
    Boolean(rob.rules && (Array.isArray(rob.rules) ? rob.rules[0].userAgent : rob.rules.userAgent) === "*"),
    "robots.txt applies universal crawler rules (*)"
  );

  // 15. Robots API endpoint disallow rule
  const disallowRules = Array.isArray(rob.rules) ? rob.rules[0].disallow : rob.rules?.disallow;
  check(
    Boolean(Array.isArray(disallowRules) && disallowRules.includes("/api/")),
    "robots.txt protects /api/ backend endpoints from public indexation"
  );

  // 16. Robots canonical sitemap link
  check(rob.sitemap === `${BRAND.url}/sitemap.xml`, "robots.txt advertises canonical XML sitemap location");

  // 17. Sitemap 25-route enumeration (13 core + 7 3D worlds + 5 games)
  const sm = sitemap();
  const smUrls = new Set(sm.map((e) => e.url));
  const expectedCorePaths = [
    "", "/world", "/games", "/tournaments", "/leaderboard", "/shop",
    "/explore", "/dashboard", "/community", "/people", "/groups", "/profile", "/setup",
  ];
  const allCorePresent = expectedCorePaths.every((p) => smUrls.has(`${BRAND.url}${p}`));
  const allWorldsPresent = ROOMS.every((r) => smUrls.has(`${BRAND.url}/world/${r.id}`));
  const allGamesPresent = GAMES.every((g) => smUrls.has(`${BRAND.url}/games?g=${g.id}`));
  const excludesAdminAndApi = sm.every((e) => !e.url.includes("/admin") && !e.url.includes("/api"));
  check(
    Array.isArray(sm) &&
      sm.length === 25 &&
      smUrls.size === 25 &&
      allCorePresent &&
      allWorldsPresent &&
      allGamesPresent &&
      excludesAdminAndApi,
    "sitemap() enumerates all 25 unique routes (13 core + 7 worlds + 5 games) and excludes /admin and /api"
  );

  // 18. Sitemap homepage priority weighting
  const homeEntry = sm.find((e) => e.url === `${BRAND.url}`);
  check(
    Boolean(homeEntry && homeEntry.priority === 1.0 && homeEntry.changeFrequency === "daily"),
    "sitemap assigns homepage highest priority 1.0 with daily change frequency"
  );

  // 19. Sitemap 3D world priority weighting
  const worldEntry = sm.find((e) => e.url === `${BRAND.url}/world`);
  check(
    Boolean(worldEntry && worldEntry.priority === 0.9 && worldEntry.changeFrequency === "daily"),
    "sitemap assigns /world priority 0.9 with daily change frequency"
  );

  // 20. Sitemap shop & tournaments priority
  const shopEntry = sm.find((e) => e.url === `${BRAND.url}/shop`);
  check(
    Boolean(shopEntry && shopEntry.priority === 0.7 && shopEntry.changeFrequency === "weekly"),
    "sitemap assigns /shop priority 0.7 with weekly change frequency"
  );

  // 21. Canonical URL generator: root path resolution
  check(
    getCanonicalUrl("") === `${BRAND.url}/` && getCanonicalUrl("/") === `${BRAND.url}/`,
    "getCanonicalUrl correctly resolves root path"
  );

  // 22. Canonical URL generator: subpath resolution
  check(
    getCanonicalUrl("shop") === `${BRAND.url}/shop` && getCanonicalUrl("/games") === `${BRAND.url}/games`,
    "getCanonicalUrl safely handles paths with or without leading slashes without double-slashing"
  );

  // =========================================================================
  // Section 5: Integration, Boundary & Error Scenarios (22 checks)
  // =========================================================================
  section("platform: integration, boundary & error scenarios");

  // 1. AudioContext constructor exception recovery
  let simulatedCrashHandled = false;
  _resetAudioContext();
  (globalThis as unknown as { window: unknown }).window = {
    AudioContext: class {
      constructor() {
        throw new Error("WebAudio hardware context unavailable");
      }
    },
  };
  try {
    play("pop"); // ac() must catch the constructor exception and return null
    simulatedCrashHandled = true;
  } catch {
    simulatedCrashHandled = false;
  }
  check(simulatedCrashHandled, "play() gracefully catches and swallows AudioContext constructor exceptions");
  delete (globalThis as unknown as { window?: unknown }).window;
  _resetAudioContext();

  // 2. High-frequency rapid sound burst resilience
  let burstThrew = false;
  try {
    for (let i = 0; i < 50; i++) {
      play(i % 2 === 0 ? "tick" : "hover");
    }
  } catch {
    burstThrew = true;
  }
  check(!burstThrew, "audio engine withstands rapid bursts of 50 consecutive sound triggers without memory corruption");

  // 3. Immutability: validatePurchase does not mutate owned array
  const ownedInput = ["hb_terminal"];
  validatePurchase("pet_byte", 200, ownedInput);
  check(
    ownedInput.length === 1 && ownedInput[0] === "hb_terminal",
    "validatePurchase treats input owned list as strictly immutable"
  );

  // 4. Immutability: equipItem does not mutate original loadout
  const originalLoadout: Loadout = { hoverboard: "hb_terminal" };
  equipItem(originalLoadout, "pet_byte", ["hb_terminal", "pet_byte"]);
  check(
    originalLoadout.pet === undefined,
    "equipItem produces a new loadout object without mutating input"
  );

  // 5. MAX_SAFE_INTEGER token balance handling
  const maxSafePurchase = validatePurchase("hb_tensor", Number.MAX_SAFE_INTEGER, []);
  check(
    Boolean(maxSafePurchase.success && maxSafePurchase.remainingTokens === Number.MAX_SAFE_INTEGER - 180),
    "validatePurchase handles Number.MAX_SAFE_INTEGER token balance without numerical overflow"
  );

  // 6. Non-finite, non-number & fractional token balance rejection
  const fractionalPurchase = validatePurchase("hb_terminal", 99.75, []);
  const fractionalEdge = validatePurchase("hb_terminal", 50.999, []);
  const nanPurchase = validatePurchase("hb_terminal", NaN, []);
  const infPurchase = validatePurchase("hb_terminal", Infinity, []);
  const strPurchase = validatePurchase("hb_terminal", "100" as unknown as number, []);
  check(
    !fractionalPurchase.success &&
      fractionalPurchase.error === "not enough tokens yet" &&
      !fractionalEdge.success &&
      !nanPurchase.success &&
      !infPurchase.success &&
      !strPurchase.success,
    "validatePurchase strictly enforces safe-integer balances and rejects fractionals, NaN, Infinity, and strings"
  );

  // 7. Negative token balance rejection
  const negativeBalance = validatePurchase("hb_terminal", -50, []);
  check(
    !negativeBalance.success && negativeBalance.error === "not enough tokens yet",
    "validatePurchase rejects negative token balances gracefully"
  );

  // 8. Prototype pollution defense in cleanGear
  const pollutedInput = JSON.parse('{"hoverboard": "hb_terminal", "__proto__": {"polluted": true}}');
  const sanitizedGear = cleanGear(pollutedInput);
  check(
    (sanitizedGear as Record<string, unknown>).polluted === undefined &&
      ({} as Record<string, unknown>).polluted === undefined,
    "cleanGear is resilient against prototype pollution attacks"
  );

  // 9. Malicious script injection in loadout slot
  const scriptInjected = cleanGear({ hoverboard: "<script>alert('pwned')</script>" });
  check(
    scriptInjected.hoverboard === undefined,
    "cleanGear rejects XSS / script payload strings"
  );

  // 10. Malformed loadout with array input
  check(
    Object.keys(cleanGear(["hb_terminal", "pet_byte"])).length === 0,
    "cleanGear returns empty object when supplied with an array"
  );

  // 11. Malformed loadout with primitive number input
  check(
    Object.keys(cleanGear(12345)).length === 0,
    "cleanGear returns empty object when supplied with a number primitive"
  );

  // 12. Unequipping a non-equipped slot is a safe no-op
  const noopUnequip = unequipItem({ hoverboard: "hb_terminal" }, "aura");
  check(
    noopUnequip.hoverboard === "hb_terminal" && noopUnequip.aura === undefined,
    "unequipItem on an unequipped slot is a safe non-destructive no-op"
  );

  // 13. Telemetry handles whitespace-only environment variables
  const wsHealth = computeHealth({
    NEXT_PUBLIC_SUPABASE_URL: "   ",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "   ",
  });
  check(!isReady(wsHealth), "computeHealth treats whitespace-only strings as absent configuration");

  // 14. Insecure non-HTTPS webhook protocols rejected
  const ftpWebhook = computeHealth({ REPORT_WEBHOOK_URL: "ftp://webhook.barmo.gg/dump" });
  check(
    ftpWebhook.find((c) => c.id === "reports")?.ok === false,
    "reports probe rejects FTP protocol webhooks"
  );

  // 15. JavaScript URI webhook injection rejected
  const jsWebhook = computeHealth({ REPORT_WEBHOOK_URL: "javascript:alert(1)" });
  check(
    jsWebhook.find((c) => c.id === "reports")?.ok === false,
    "reports probe rejects javascript: URI webhooks"
  );

  // 16. Duplicate ban rejection in ModerationEngine
  const modEngine = new ModerationEngine();
  modEngine.banUser("user_dup", "mod_1", "Initial ban");
  const dupBan = modEngine.banUser("user_dup", "mod_1", "Duplicate ban attempt");
  check(
    !dupBan.success && dupBan.error === "user already banned",
    "ModerationEngine prevents duplicate ban creation"
  );

  // 17. Unmuting an unmuted user returns informative status
  const unneededUnmute = modEngine.unmuteUser("user_not_muted", "mod_1", "Accidental unmute");
  check(
    !unneededUnmute.success && unneededUnmute.error === "user is not muted",
    "unmuteUser reports error when user is not currently muted"
  );

  // 18. Moderation audit log immutability
  const logs = modEngine.getAuditLogs();
  try {
    (logs as unknown as Array<{ id: string }>).push({ id: "hacked" });
  } catch {
    /* frozen */
  }
  check(
    modEngine.getAuditLogs().find((l) => l.id === "hacked") === undefined,
    "audit log collection cannot be externally mutated"
  );

  // 19. Empty reason fallback in moderation actions
  const noReasonMute = modEngine.muteUser("user_empty_reason", "mod_1", "");
  check(
    Boolean(noReasonMute.success && noReasonMute.entry?.reason === "No reason provided"),
    "moderation actions apply fallback reason when empty string is passed"
  );

  // 20. Reporting payload: string clipping to max length
  const clippedTarget = clipString("a".repeat(100), 40);
  check(
    clippedTarget.length === 40,
    "moderation reporting utilities clip target strings to 40 characters maximum"
  );

  // 21. Reporting payload: control character sanitization
  const sanitizedReportText = sanitizeControlChars("Hello\u0000World\u001f!");
  check(
    sanitizedReportText === "Hello World !",
    "reporting utilities strip ASCII control characters (\\u0000-\\u001f)"
  );

  // 22. Board visibility toggle inversion invariant
  check(
    toggleBoardVisibility(toggleBoardVisibility(true)) === true,
    "toggleBoardVisibility is an exact mathematical involution (f(f(x)) = x)"
  );
}

export async function run() {
  await runPlatformTests();
}

// Run immediately if executed directly
if (typeof require !== "undefined" && require.main === module) {
  void run();
}
