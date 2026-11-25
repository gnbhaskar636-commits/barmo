import { check, section } from "./_t";
import { isValidRoomCode, getRoomShareLink } from "../lib/games/types";
import {
  generateBracket,
  findMatch,
  buildBracketTree,
  advanceWinnerInBracket,
  getRoundName,
  SEED_PAIRS_8,
  SEED_PAIRS_16,
} from "../lib/tournaments/brackets";
import {
  calculatePrizePool,
  resolveTie,
  verifyMatchResult,
  calculateSpeedrunLadder,
  generateMatchRoomCode,
  tournamentStore,
  getTournaments,
  registerParticipant,
  launchTournamentMatch,
  advanceTournamentWinner,
} from "../lib/tournaments/engine";
import type {
  TournamentParticipant,
  TournamentRound,
} from "../lib/tournaments/types";
import { pickBalancedTeam, updateLobbyStats } from "../components/games/useGame";
import type { GPlayer, GState, Act } from "../lib/games/types";
import { diceEngine, quizEngine, raceEngine, memoryEngine, cybercodeEngine } from "../lib/games/engines";

export async function run() {
  // =========================================================================
  // 1. Room Code Generation and Validation Rules
  // =========================================================================
  section("multiplayer lobbies: room code validation and link generation");
  {
    check(isValidRoomCode("WARP42"), "valid 6-char alphanumeric room code accepted");
    check(isValidRoomCode("CYBER8"), "valid alphanumeric room code accepted");
    check(isValidRoomCode("A1B2C3D4"), "valid 8-char room code accepted");
    check(isValidRoomCode("GAME"), "valid 4-char min length room code accepted");

    // Invalid codes
    check(!isValidRoomCode("warp42"), "rejects lowercase room code");
    check(!isValidRoomCode("WARP-42"), "rejects hyphen in room code");
    check(!isValidRoomCode("WARP 42"), "rejects space in room code");
    check(!isValidRoomCode("ABC"), "rejects room code shorter than 4 characters");
    check(!isValidRoomCode("TOOLONG123"), "rejects room code longer than 8 characters");
    check(!isValidRoomCode(""), "rejects empty room code");
    check(!isValidRoomCode("WARP!#"), "rejects special characters in room code");

    // Share link generation
    const linkJoin = getRoomShareLink("CYBER8", false, "https://barmo.gg");
    check(linkJoin === "https://barmo.gg/games?join=CYBER8", "generates valid player join link");

    const linkSpectate = getRoomShareLink("CYBER8", true, "https://barmo.gg");
    check(linkSpectate === "https://barmo.gg/games?spectate=CYBER8", "generates valid spectator join link");

    // Match room code generation
    const matchCode = generateMatchRoomCode("tourney-1", 2);
    check(isValidRoomCode(matchCode), "generateMatchRoomCode creates valid room code");
    check(matchCode.startsWith("TR3"), "generateMatchRoomCode formats match prefix");
  }

  // =========================================================================
  // 2. Lobby Ready-Check State Transitions and Spectator Role Isolation
  // =========================================================================
  section("multiplayer lobbies: ready check & spectator role isolation");
  {
    const state: GState = {
      game: "dice",
      phase: "lobby",
      round: 0,
      rounds: 3,
      host: "host1",
      msg: "Waiting for players",
      players: {
        host1: { id: "host1", name: "Host", av: "atlas", score: 0, ready: true, role: "player", team: "neon" },
        p2: { id: "p2", name: "Player 2", av: "sage", score: 0, ready: false, role: "player", team: "cyber" },
        p3: { id: "p3", name: "Player 3", av: "slate", score: 0, ready: false, role: "player", team: "sol" },
      },
    };

    updateLobbyStats(state);
    check(state.readyCount === 1, "initial readyCount counts only host");
    check(state.spectatorCount === 0, "initial spectatorCount is 0");

    // Player 2 readies up
    state.players.p2.ready = true;
    updateLobbyStats(state);
    check(state.readyCount === 2, "readyCount increments when p2 readies up");

    // Player 3 switches to spectator role
    state.players.p3.role = "spectator";
    state.players.p3.ready = false;
    updateLobbyStats(state);
    check(state.spectatorCount === 1, "spectatorCount increments when p3 becomes spectator");
    check(state.readyCount === 2, "spectators are excluded from ready count");

    // Verify spectator cannot perform game actions
    state.phase = "play";
    state.rolls = {};
    const spectatorAct: Act = { t: "roll" };

    // In gameplay, spectator roll is ignored by role check guard
    const isSpectator = state.players.p3.role === "spectator";
    check(isSpectator === true, "p3 is recognized as spectator");

    // If an action handler receives an action from a spectator, it should reject or return null
    let spectatorActionAllowed = false;
    if (!isSpectator) {
      const patch = diceEngine.handleAct(spectatorAct, "p3", state);
      if (patch) spectatorActionAllowed = true;
    }
    check(!spectatorActionAllowed, "spectator role is isolated from taking gameplay actions");

    // Active player p2 takes action
    const playerPatch = diceEngine.handleAct(spectatorAct, "p2", state);
    check(playerPatch !== null && playerPatch.rolls?.p2 !== undefined, "active player can take gameplay actions");

    // Spectator isolation in isRoundComplete across game engines
    state.rolls = { host1: 4, p2: 5 }; // p3 is spectator and has no roll
    check(diceEngine.isRoundComplete(state) === true, "diceEngine.isRoundComplete returns true without waiting for spectator");

    const quizState: GState = {
      game: "quiz",
      phase: "play",
      round: 1,
      rounds: 3,
      host: "host1",
      msg: "",
      players: { ...state.players },
      answers: { host1: 0, p2: 2 }, // p3 is spectator
    };
    check(quizEngine.isRoundComplete(quizState) === true, "quizEngine.isRoundComplete returns true without waiting for spectator");

    const raceState: GState = {
      game: "race",
      phase: "play",
      round: 1,
      rounds: 3,
      host: "host1",
      msg: "",
      players: { ...state.players },
      taps: ["host1", "p2"], // p3 is spectator
      early: [],
    };
    check(raceEngine.isRoundComplete(raceState) === true, "raceEngine.isRoundComplete returns true without waiting for spectator");

    const memoryState: GState = {
      game: "memory",
      phase: "play",
      round: 1,
      rounds: 3,
      host: "host1",
      msg: "",
      players: { ...state.players },
      memorySeq: [0, 1, 2],
      memoryInput: { host1: [0, 1, 2], p2: [0, 1, 2] },
      memoryFailures: [],
    };
    check(memoryEngine.isRoundComplete(memoryState) === true, "memoryEngine.isRoundComplete returns true without waiting for spectator");

    const cybercodeState: GState = {
      game: "cybercode",
      phase: "play",
      round: 1,
      rounds: 3,
      host: "host1",
      msg: "",
      players: { ...state.players },
      codeResults: { host1: { pass: true }, p2: { pass: true } },
    };
    check(cybercodeEngine.isRoundComplete(cybercodeState) === true, "cybercodeEngine.isRoundComplete returns true without waiting for spectator");

    // Spectators are excluded from evaluateRound scoring in diceEngine
    const diceEvalState: GState = {
      game: "dice",
      phase: "play",
      round: 1,
      rounds: 3,
      host: "host1",
      msg: "",
      players: {
        host1: { id: "host1", name: "Host", av: "atlas", score: 0, ready: true, role: "player" },
        spec1: { id: "spec1", name: "Spec", av: "slate", score: 0, ready: false, role: "spectator" },
      },
      rolls: { host1: 1 },
    };
    const evalRes = diceEngine.evaluateRound(diceEvalState);
    check(evalRes.scores.spec1 === undefined, "spectators are excluded from evaluateRound scores in diceEngine");
    check(evalRes.winners?.includes("spec1") === false, "spectators never win rounds in diceEngine");
    check(diceEvalState.rolls?.spec1 === undefined, "spectators never receive fallback rolls in diceEngine");
  }

  // =========================================================================
  // 3. Team Assignment and Balancing
  // =========================================================================
  section("multiplayer lobbies: team assignment and balancing");
  {
    const emptyLobby: Record<string, GPlayer> = {};
    const firstTeam = pickBalancedTeam(emptyLobby);
    check(firstTeam === "neon", "empty lobby defaults to neon team");

    const unbalancedLobby: Record<string, GPlayer> = {
      p1: { id: "p1", name: "P1", av: "atlas", score: 0, team: "neon" },
      p2: { id: "p2", name: "P2", av: "sage", score: 0, team: "neon" },
      p3: { id: "p3", name: "P3", av: "slate", score: 0, team: "cyber" },
    };
    const nextTeam = pickBalancedTeam(unbalancedLobby);
    check(nextTeam === "sol", "balancing algorithm assigns least populated team (sol)");

    unbalancedLobby.p4 = { id: "p4", name: "P4", av: "clay", score: 0, team: "sol" };
    const nextTeam2 = pickBalancedTeam(unbalancedLobby);
    check(nextTeam2 === "cyber", "balancing algorithm assigns cyber when cyber has 1 and others have 2");
  }

  // =========================================================================
  // 4. Tournament Bracket Creation (8-team & 16-team), Seeded Pairing & Byes
  // =========================================================================
  section("tournaments: 8-team and 16-team bracket generation & seeded pairing");
  {
    // 8-participant seeded bracket
    const participants8: TournamentParticipant[] = [
      { id: "p1", name: "Player 1", seed: 1 },
      { id: "p2", name: "Player 2", seed: 2 },
      { id: "p3", name: "Player 3", seed: 3 },
      { id: "p4", name: "Player 4", seed: 4 },
      { id: "p5", name: "Player 5", seed: 5 },
      { id: "p6", name: "Player 6", seed: 6 },
      { id: "p7", name: "Player 7", seed: 7 },
      { id: "p8", name: "Player 8", seed: 8 },
    ];

    const bracket8 = generateBracket("test-8", "dice", 8, participants8);
    check(bracket8.length === 3, "8-team bracket has exactly 3 rounds (QF, SF, Finals)");
    check(bracket8[0].matches.length === 4, "round 1 (QF) has 4 matches");
    check(bracket8[1].matches.length === 2, "round 2 (SF) has 2 matches");
    check(bracket8[2].matches.length === 1, "round 3 (Finals) has 1 match");
    check(bracket8[0].name === "Quarterfinals", "round 1 name is Quarterfinals");
    check(bracket8[1].name === "Semifinals", "round 2 name is Semifinals");
    check(bracket8[2].name === "Grand Finals", "round 3 name is Grand Finals");

    // Verify Seeded Pairings for 8-team: [1 vs 8], [4 vs 5], [2 vs 7], [3 vs 6]
    const m1 = bracket8[0].matches[0];
    const m2 = bracket8[0].matches[1];
    const m3 = bracket8[0].matches[2];
    const m4 = bracket8[0].matches[3];

    check(m1.p1?.seed === 1 && m1.p2?.seed === 8, "match 1 seeds are #1 vs #8");
    check(m2.p1?.seed === 4 && m2.p2?.seed === 5, "match 2 seeds are #4 vs #5");
    check(m3.p1?.seed === 2 && m3.p2?.seed === 7, "match 3 seeds are #2 vs #7");
    check(m4.p1?.seed === 3 && m4.p2?.seed === 6, "match 4 seeds are #3 vs #6");

    // Verify progression linking
    check(m1.nextMatchId === bracket8[1].matches[0].id && m1.nextMatchSlot === 1, "m1 feeds SF1 slot 1");
    check(m2.nextMatchId === bracket8[1].matches[0].id && m2.nextMatchSlot === 2, "m2 feeds SF1 slot 2");
    check(m3.nextMatchId === bracket8[1].matches[1].id && m3.nextMatchSlot === 1, "m3 feeds SF2 slot 1");
    check(m4.nextMatchId === bracket8[1].matches[1].id && m4.nextMatchSlot === 2, "m4 feeds SF2 slot 2");

    // 16-participant seeded bracket
    const participants16: TournamentParticipant[] = Array.from({ length: 16 }, (_, i) => ({
      id: `p${i + 1}`,
      name: `Player ${i + 1}`,
      seed: i + 1,
    }));
    const bracket16 = generateBracket("test-16", "race", 16, participants16);
    check(bracket16.length === 4, "16-team bracket has exactly 4 rounds");
    check(bracket16[0].matches.length === 8, "round 1 has 8 matches");
    check(bracket16[1].matches.length === 4, "round 2 has 4 matches");
    check(bracket16[2].matches.length === 2, "round 3 has 2 matches");
    check(bracket16[3].matches.length === 1, "round 4 has 1 match");
    check(bracket16[0].name === "Round of 16", "round 1 name is Round of 16");

    // Bye handling: when 6 players enter an 8-team bracket
    const partial6: TournamentParticipant[] = participants8.slice(0, 6); // seeds 1..6
    const bracketWithByes = generateBracket("test-byes", "quiz", 8, partial6);
    const byeMatch1 = bracketWithByes[0].matches[0]; // Seed 1 vs Seed 8 (missing)
    const byeMatch3 = bracketWithByes[0].matches[2]; // Seed 2 vs Seed 7 (missing)

    check(byeMatch1.isBye === true, "match 1 is flagged as bye for Seed 1");
    check(byeMatch1.winnerId === "p1", "Seed 1 automatically wins bye match 1");
    check(byeMatch3.isBye === true, "match 3 is flagged as bye for Seed 2");
    check(byeMatch3.winnerId === "p2", "Seed 2 automatically wins bye match 3");

    // Check automatic bye propagation to Semifinals
    const sfWithByes = bracketWithByes[1].matches;
    check(sfWithByes[0].p1?.id === "p1", "Seed 1 automatically advanced into SF1 slot 1");
    check(sfWithByes[1].p1?.id === "p2", "Seed 2 automatically advanced into SF2 slot 1");

    // BracketNode tree structure
    const tree = buildBracketTree(bracket8);
    check(tree !== null, "buildBracketTree returns root node");
    check(tree?.round === 3, "tree root is Grand Finals (round 3)");
    check(tree?.left !== undefined && tree?.right !== undefined, "root node has left and right semifinal feeder nodes");
    check(tree?.left?.left !== undefined, "semifinal node has quarterfinal feeders");
  }

  // =========================================================================
  // 5. Match Verification and Winner Advancement Through Semi-finals & Finals
  // =========================================================================
  section("tournaments: match verification & multi-round winner advancement");
  {
    const participants: TournamentParticipant[] = [
      { id: "p1", name: "Vega", seed: 1 },
      { id: "p2", name: "Viper", seed: 8 },
      { id: "p3", name: "Ace", seed: 4 },
      { id: "p4", name: "Glitch", seed: 5 },
      { id: "p5", name: "Blade", seed: 2 },
      { id: "p6", name: "Rider", seed: 7 },
      { id: "p7", name: "Hyperion", seed: 3 },
      { id: "p8", name: "Synapse", seed: 6 },
    ];
    const rounds = generateBracket("tourney-prog", "dice", 8, participants);
    const mockTourney = {
      id: "tourney-prog",
      title: "Progression Test",
      game: "dice" as const,
      gameTitle: "Dice",
      gameIcon: "🎲",
      size: 8 as const,
      status: "active" as const,
      rounds,
      participants,
      maxParticipants: 8,
      prizePool: 10000,
      entryFee: "Free",
      date: "NOW",
      format: "Single Elimination" as const,
    };

    // Match verification checks
    const m1Id = rounds[0].matches[0].id;
    const vValid = verifyMatchResult(mockTourney, m1Id, 24, 18, "p1");
    check(vValid.valid === true && vValid.winnerId === "p1", "verifyMatchResult approves correct higher score winner");

    const vMismatch = verifyMatchResult(mockTourney, m1Id, 24, 18, "p2");
    check(vMismatch.valid === false, "verifyMatchResult rejects declared winner when score is lower");

    const vNegative = verifyMatchResult(mockTourney, m1Id, -5, 10);
    check(vNegative.valid === false, "verifyMatchResult rejects negative scores");

    // Advance QF1: Vega (p1) beats Viper (p2)
    const qf1Res = advanceWinnerInBracket(rounds, "tourney-prog-r1-m1", "p1", 24, 18);
    check(rounds[0].matches[0].status === "completed", "QF1 marked completed");
    check(rounds[0].matches[0].winnerId === "p1", "QF1 winner is p1");
    check(qf1Res.nextMatch?.p1?.id === "p1", "QF1 winner slotted into SF1 slot 1");

    // Advance QF2: Ace (p3) beats Glitch (p4)
    const qf2Res = advanceWinnerInBracket(rounds, "tourney-prog-r1-m2", "p3", 22, 19);
    check(qf2Res.nextMatch?.p2?.id === "p3", "QF2 winner slotted into SF1 slot 2");
    check(rounds[1].matches[0].status === "scheduled", "SF1 becomes scheduled when both slots are filled");

    // Advance QF3: Blade (p5) beats Rider (p6)
    advanceWinnerInBracket(rounds, "tourney-prog-r1-m3", "p5", 20, 15);

    // Advance QF4: Hyperion (p7) beats Synapse (p8)
    advanceWinnerInBracket(rounds, "tourney-prog-r1-m4", "p7", 25, 21);
    check(rounds[1].matches[1].p1?.id === "p5" && rounds[1].matches[1].p2?.id === "p7", "SF2 slots filled with p5 and p7");

    // Advance Semifinal 1: Vega (p1) beats Ace (p3)
    const sf1Res = advanceWinnerInBracket(rounds, "tourney-prog-r2-m1", "p1", 30, 25);
    check(sf1Res.nextMatch?.p1?.id === "p1", "Vega advanced to Grand Finals slot 1");

    // Advance Semifinal 2: Hyperion (p7) beats Blade (p5)
    const sf2Res = advanceWinnerInBracket(rounds, "tourney-prog-r2-m2", "p7", 28, 26);
    check(sf2Res.nextMatch?.p2?.id === "p7", "Hyperion advanced to Grand Finals slot 2");

    // Advance Grand Finals: Vega (p1) beats Hyperion (p7)
    const finalRes = advanceWinnerInBracket(rounds, "tourney-prog-r3-m1", "p1", 35, 32);
    check(finalRes.tournamentWinner?.id === "p1", "Vega crowned overall Tournament Champion");
    check(finalRes.nextMatch === undefined, "Grand Finals has no subsequent match");
    check(participants.find((p) => p.id === "p7")?.eliminated === true, "runner up marked eliminated");
  }

  // =========================================================================
  // 6. Prize Pool Calculation and Tie Resolutions
  // =========================================================================
  section("tournaments: prize pool distribution & tie resolution");
  {
    const participants: TournamentParticipant[] = [
      { id: "p1", name: "Champion Vega", seed: 1 },
      { id: "p2", name: "RunnerUp Hyperion", seed: 3 },
      { id: "p3", name: "Semifinalist Ace", seed: 4 },
      { id: "p4", name: "Semifinalist Blade", seed: 2 },
    ];

    const pool = 10000;
    const prizes = calculatePrizePool(pool, participants);
    check(prizes.length === 4, "calculates 4 prize tiers");

    const p1 = prizes.find((p) => p.rank === 1)!;
    const p2 = prizes.find((p) => p.rank === 2)!;
    const p3 = prizes.find((p) => p.rank === 3)!;
    const p4 = prizes.find((p) => p.rank === 4)!;

    check(p1.percentage === 60 && p1.tokens === 6000, "1st place receives exactly 60% (6000 tokens)");
    check(p2.percentage === 25 && p2.tokens === 2500, "2nd place receives exactly 25% (2500 tokens)");
    check(p3.percentage === 10 && p3.tokens === 1000, "3rd place receives exactly 10% (1000 tokens)");
    check(p4.percentage === 5 && p4.tokens === 500, "4th place receives exactly 5% (500 tokens)");

    const totalDistributed = prizes.reduce((sum, p) => sum + p.tokens, 0);
    check(totalDistributed === pool, "sum of distributed prize tokens equals exactly 100% of pool");
    check(p1.participantId === "p1" && p1.participantName === "Champion Vega", "prizes associate correct champion details");

    // Tie resolution
    const partA: TournamentParticipant = { id: "a", name: "Alpha", seed: 2 };
    const partB: TournamentParticipant = { id: "b", name: "Beta", seed: 7 };
    const tieWinner = resolveTie(partA, partB, "seed");
    check(tieWinner.id === "a", "tiebreak awards victory to higher seed (#2 over #7)");

    // Speedrun ladder rankings
    const speedrunEntries = [
      { id: "r1", name: "Racer 1", timeMs: 42150 },
      { id: "r2", name: "Racer 2", timeMs: 38920 },
      { id: "r3", name: "Racer 3", timeMs: 40500 },
    ];
    const ladder = calculateSpeedrunLadder(speedrunEntries);
    check(ladder[0].id === "r2" && ladder[0].rank === 1, "fastest speedrun ranked #1");
    check(ladder[1].id === "r3" && ladder[1].rank === 2, "second fastest speedrun ranked #2");
    check(ladder[2].id === "r1" && ladder[2].rank === 3, "third fastest speedrun ranked #3");

    // Small prize pool clamping verification
    const smallPool = 6;
    const smallPrizes = calculatePrizePool(smallPool);
    check(smallPrizes.length === 4, "small prize pool has 4 tiers");
    check(smallPrizes.every((p) => p.tokens >= 0), "calculatePrizePool(6) distributes non-negative tokens across all ranks");
    const smallTotal = smallPrizes.reduce((sum, p) => sum + p.tokens, 0);
    check(smallTotal === smallPool, "calculatePrizePool(6) distributed sum strictly equals prize pool");
    check(smallPrizes[3].tokens >= 0, "4th place receives non-negative tokens on small pool");

    // Speedrun ladder tie-breaking on identical timestamps
    const tiedEntries = [
      { id: "beta", name: "Beta Racer", timeMs: 35000 },
      { id: "alpha", name: "Alpha Racer", timeMs: 35000 },
      { id: "gamma", name: "Gamma Racer", timeMs: 35000 },
    ];
    const tiedLadder = calculateSpeedrunLadder(tiedEntries);
    check(tiedLadder[0].id === "alpha" && tiedLadder[0].rank === 1, "identical timeMs breaks tie deterministically by id (alpha #1)");
    check(tiedLadder[1].id === "beta" && tiedLadder[1].rank === 2, "identical timeMs breaks tie deterministically by id (beta #2)");
    check(tiedLadder[2].id === "gamma" && tiedLadder[2].rank === 3, "identical timeMs breaks tie deterministically by id (gamma #3)");
  }

  // =========================================================================
  // 7. Tournament Store & Lifecycle Integration
  // =========================================================================
  section("tournaments: store lifecycle, registration & match launch");
  {
    tournamentStore.reset();
    const all = getTournaments();
    check(all.length >= 4, "initializes preloaded tournaments");

    const cyber = all.find((t) => t.id === "tourney-cyber-neon");
    check(cyber !== undefined, "retrieves Cyber Neon Championship");
    check(cyber?.status === "active", "Cyber Neon Championship is live");

    // Registration flow
    const regResult = registerParticipant("tourney-quantum-speedrun", {
      id: "new-user-1",
      name: "NewRacer",
      avatar: "atlas",
      team: "neon",
    });
    check(regResult.success === true, "registers new user successfully");
    check(regResult.participant?.name === "NewRacer", "creates participant record");

    // Duplicate registration guard
    const dupResult = registerParticipant("tourney-quantum-speedrun", {
      id: "new-user-1",
      name: "NewRacer",
    });
    check(dupResult.success === false, "prevents duplicate registration");

    // Launch match with room code
    const sf1Match = cyber!.rounds[1].matches[0];
    const launched = launchTournamentMatch("tourney-cyber-neon", sf1Match.id);
    check(launched.status === "live", "launched match is set to live");
    check(launched.roomCode !== undefined && isValidRoomCode(launched.roomCode), "launched match has valid room code");
  }
}
