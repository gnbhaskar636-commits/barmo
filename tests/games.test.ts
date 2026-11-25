import { check, near, section } from "./_t";
import { getEngine, allEngines, diceEngine, quizEngine, raceEngine, memoryEngine, cybercodeEngine } from "../lib/games/engines";
import type { GPlayer, GState } from "../lib/games/types";

const makePlayers = (...ids: string[]): Record<string, GPlayer> => {
  const p: Record<string, GPlayer> = {};
  ids.forEach((id) => {
    p[id] = { id, name: id.toUpperCase(), av: "atlas", score: 0 };
  });
  return p;
};

export async function run() {
  section("modular game hub: engine registry");
  check(allEngines().length === 5, "all 5 modular game engines registered");
  check(getEngine("dice").id === "dice", "getEngine resolves dice");
  check(getEngine("quiz").id === "quiz", "getEngine resolves quiz");
  check(getEngine("race").id === "race", "getEngine resolves race");
  check(getEngine("memory").id === "memory", "getEngine resolves memory");
  check(getEngine("cybercode").id === "cybercode", "getEngine resolves cybercode");
  // @ts-expect-error fallback test
  check(getEngine("unknown").id === "dice", "getEngine falls back safely for invalid game ID");

  // =========================================================================
  // 1. Cyber Dice Duel Engine
  // =========================================================================
  section("modular game engines: Cyber Dice Duel");
  {
    const players = makePlayers("p1", "p2", "p3");
    const init = diceEngine.initRound(1, players);
    check(init.rolls !== undefined && Object.keys(init.rolls).length === 0, "dice initRound resets rolls");
    check(init.multipliers !== undefined, "dice initRound initializes multipliers");

    const state: GState = {
      game: "dice",
      phase: "play",
      round: 1,
      rounds: 3,
      host: "p1",
      players,
      rolls: {},
      msg: "",
    };

    // Valid roll
    const patch1 = diceEngine.handleAct({ t: "roll" }, "p1", state);
    check(patch1 !== null, "dice accepts roll action");
    check(patch1?.rolls?.["p1"] !== undefined, "dice records p1 roll");
    const r1 = patch1!.rolls!["p1"];
    check(r1 >= 1 && r1 <= 6, "dice roll is in bounds 1..6");
    check(patch1?.multipliers?.["p1"] !== undefined, "dice assigns multiplier");

    // Duplicate roll rejection
    Object.assign(state, patch1);
    const patchDup = diceEngine.handleAct({ t: "roll" }, "p1", state);
    check(patchDup === null, "dice rejects duplicate roll in same round");

    // Invalid action rejection
    // @ts-expect-error invalid action
    const patchInvalid = diceEngine.handleAct({ t: "tap" }, "p2", state);
    check(patchInvalid === null, "dice rejects non-roll action");

    // Completion check
    check(!diceEngine.isRoundComplete!(state), "dice round not complete when some players haven't rolled");
    state.rolls = { p1: 5, p2: 3, p3: 6 };
    check(diceEngine.isRoundComplete!(state), "dice round complete when all players rolled");

    // Evaluation: highest roller wins point
    state.multipliers = { p1: 1, p2: 1, p3: 2 }; // p3 rolled 6 with 2x multiplier
    const evalResult = diceEngine.evaluateRound(state);
    check(evalResult.scores["p3"] === 2, "dice evaluation awards 2 pts to highest roller with 2x multiplier");
    check(evalResult.scores["p1"] === undefined, "dice evaluation does not award points to lower rolls");
    check(evalResult.winnerId === "p3", "dice evaluation sets correct winnerId");
    check(evalResult.msg.includes("6"), "dice evaluation message contains highest roll value");

    // Tie evaluation
    const tieState: GState = {
      ...state,
      rolls: { p1: 6, p2: 6, p3: 4 },
      multipliers: { p1: 1, p2: 1, p3: 1 },
    };
    const tieEval = diceEngine.evaluateRound(tieState);
    check(tieEval.scores["p1"] === 1 && tieEval.scores["p2"] === 1, "dice tie awards points to all tied top rollers");
    check(tieEval.winners?.length === 2, "dice tie identifies both winners");

    // Bot simulation
    let botDispatched = false;
    diceEngine.simulateBotTurn(players["p1"], { ...state, rolls: {} }, (act) => {
      if (act.t === "roll") botDispatched = true;
    });
    check(botDispatched, "dice bot simulation dispatches roll action");
  }

  // =========================================================================
  // 2. Neural Quiz Arena Engine
  // =========================================================================
  section("modular game engines: Neural Quiz Arena");
  {
    const players = makePlayers("p1", "p2");
    const secret: any = {};
    const init = quizEngine.initRound(1, players, secret);
    check(init.q !== undefined && init.q.opts.length === 4, "quiz initRound loads 4 holographic options");
    check(typeof secret.correct === "number" && secret.correct >= 0 && secret.correct <= 3, "quiz privately tracks correct option index");

    const state: GState = {
      game: "quiz",
      phase: "play",
      round: 1,
      rounds: 5,
      host: "p1",
      players,
      q: init.q,
      answers: {},
      msg: "",
    };

    // Valid answer
    const patch1 = quizEngine.handleAct({ t: "ans", i: secret.correct }, "p1", state, secret);
    check(patch1 !== null, "quiz accepts valid answer action");
    check(patch1?.answers?.["p1"] === secret.correct, "quiz records p1 answer");
    check(typeof secret.times["p1"] === "number", "quiz records response time in secret");

    // Duplicate answer rejection
    Object.assign(state, patch1);
    const patchDup = quizEngine.handleAct({ t: "ans", i: 0 }, "p1", state, secret);
    check(patchDup === null, "quiz rejects duplicate answer from same player");

    // Out-of-bounds answer rejection
    const patchLow = quizEngine.handleAct({ t: "ans", i: -1 }, "p2", state, secret);
    const patchHigh = quizEngine.handleAct({ t: "ans", i: 4 }, "p2", state, secret);
    check(patchLow === null && patchHigh === null, "quiz rejects out-of-range option indices");

    // Second player answers incorrectly
    const wrongOpt = (secret.correct + 1) % 4;
    const patch2 = quizEngine.handleAct({ t: "ans", i: wrongOpt }, "p2", state, secret);
    Object.assign(state, patch2);
    check(quizEngine.isRoundComplete!(state), "quiz round complete when all players answered");

    // Evaluation: speed bonus scoring
    secret.times["p1"] = 2000; // Fast answer: 2000ms out of 12000ms dur
    secret.times["p2"] = 1000; // Wrong answer: regardless of time gets 0
    const evalResult = quizEngine.evaluateRound(state, secret);
    check(evalResult.scores["p1"] >= 14, "quiz awards base 10 + speed bonus (>=14) for fast correct answer");
    check(evalResult.scores["p2"] === undefined, "quiz awards zero points for wrong answer");
    check(state.correct === secret.correct, "quiz reveals correct answer index in state");
    check(evalResult.msg.startsWith("Correct answer:"), "quiz reveals answer label in message");

    // Bot simulation
    let botAns: number | null = null;
    quizEngine.simulateBotTurn(players["p2"], state, (act) => {
      if (act.t === "ans") botAns = act.i;
    }, secret);
    check(botAns !== null && botAns >= 0 && botAns <= 3, "quiz bot simulation submits valid answer index");
  }

  // =========================================================================
  // 3. Quantum Warp Grand Prix Engine
  // =========================================================================
  section("modular game engines: Quantum Warp Grand Prix");
  {
    const players = makePlayers("racer1", "racer2", "racer3", "racer4");
    const secret: any = { goAt: 1000000, times: {} };
    const init = raceEngine.initRound(1, players, secret);
    check(init.rs === "wait", "race starts in wait charging state");
    check(init.taps?.length === 0 && init.early?.length === 0, "race initializes empty taps and early lists");

    const state: GState = {
      game: "race",
      phase: "play",
      round: 1,
      rounds: 3,
      host: "racer1",
      players,
      rs: "wait",
      taps: [],
      early: [],
      msg: "",
    };

    // False start during wait
    const earlyPatch = raceEngine.handleAct({ t: "tap" }, "racer4", state, secret);
    check(earlyPatch?.early?.includes("racer4") === true, "race records false start tap during wait");
    Object.assign(state, earlyPatch);

    // Duplicate tap rejected
    const dupEarly = raceEngine.handleAct({ t: "tap" }, "racer4", state, secret);
    check(dupEarly === null, "race rejects duplicate tap from early player");

    // Flare triggers GO
    state.rs = "go";

    // Racer 1 taps with supersonic speed (<160ms -> nitro)
    secret.times["racer1"] = 120;
    const tap1 = raceEngine.handleAct({ t: "tap" }, "racer1", state, secret);
    Object.assign(state, tap1);

    // Racer 2 taps with drafting (<120ms behind racer 1)
    secret.times["racer2"] = 190; // 190 - 120 = 70ms behind -> slipstream drafting!
    const tap2 = raceEngine.handleAct({ t: "tap" }, "racer2", state, secret);
    Object.assign(state, tap2);

    // Racer 3 taps with normal speed
    secret.times["racer3"] = 450;
    const tap3 = raceEngine.handleAct({ t: "tap" }, "racer3", state, secret);
    Object.assign(state, tap3);

    check(raceEngine.isRoundComplete!(state), "race round complete when all active racers tapped or fouled");

    // Evaluate race round
    const evalResult = raceEngine.evaluateRound(state, secret);
    // Racer 1: <160ms -> nitro = true, +5 pts
    check(evalResult.scores["racer1"] === 5, "race awards +5 pts for sub-160ms supersonic nitro tap");
    check(state.nitro?.["racer1"] === true, "race flags nitro critical for sub-160ms tap");

    // Racer 2: 190ms (<250ms: +3 pts) + drafting bonus (+1 pt) = 4 pts
    check(evalResult.scores["racer2"] === 4, "race awards +3 pts tier + 1 pt quantum drafting bonus");
    check(state.slips?.["racer2"] !== undefined, "race flags drafting partner in telemetry");

    // Racer 3: 450ms (>=400ms: +1 pt)
    check(evalResult.scores["racer3"] === 1, "race awards +1 pt for standard reaction time");

    // Racer 4: False start -> 0 pts
    check(evalResult.scores["racer4"] === undefined, "race awards 0 points for tachyon overheat false start");

    // Winner
    check(evalResult.winnerId === "racer1", "race evaluation crowns P1 fastest reaction tap");

    // Bot simulation
    let botTapped = false;
    raceEngine.simulateBotTurn(players["racer1"], { ...state, taps: [], early: [] }, (act) => {
      if (act.t === "tap") botTapped = true;
    });
    check(botTapped, "race bot simulation dispatches tap action");
  }

  // =========================================================================
  // 4. Matrix Memory Lock Engine
  // =========================================================================
  section("modular game engines: Matrix Memory Lock");
  {
    const players = makePlayers("agent_a", "agent_b", "agent_c");
    const secret: any = {};

    // Escalating round sequence lengths
    const r1 = memoryEngine.initRound(1, players, secret);
    check(r1.memorySeq?.length === 3, "memory round 1 generates 3 glyphs sequence");
    const r2 = memoryEngine.initRound(2, players, secret);
    check(r2.memorySeq?.length === 4, "memory round 2 generates 4 glyphs sequence");
    const r3 = memoryEngine.initRound(3, players, secret);
    check(r3.memorySeq?.length === 5, "memory round 3 generates 5 glyphs sequence");
    const r4 = memoryEngine.initRound(4, players, secret);
    check(r4.memorySeq?.length === 6, "memory round 4 generates 6 glyphs sequence");

    const targetSeq = [0, 2, 1, 3];
    secret.memorySeq = targetSeq;
    secret.inputStart = 1000;

    const state: GState = {
      game: "memory",
      phase: "play",
      round: 2,
      rounds: 4,
      host: "agent_a",
      players,
      memorySeq: targetSeq,
      memoryInput: {},
      memoryPhase: "watch",
      memoryFailures: [],
      memoryTimes: {},
      msg: "",
    };

    // Rejection during watch phase
    const tapWatch = memoryEngine.handleAct({ t: "seq_tap", index: 0 }, "agent_a", state, secret);
    check(tapWatch === null, "memory rejects taps during watch playback phase");

    // Transition to input phase
    state.memoryPhase = "input";

    // Agent A enters correct sequence step by step
    for (let step = 0; step < targetSeq.length; step++) {
      const patch = memoryEngine.handleAct({ t: "seq_tap", index: targetSeq[step] }, "agent_a", state, secret);
      check(patch !== null, `memory accepts correct step ${step} for agent_a`);
      Object.assign(state, patch);
    }
    check(state.memoryInput?.["agent_a"]?.length === 4, "agent_a completed all 4 cipher steps");

    // Agent B makes mistake on step 2
    memoryEngine.handleAct({ t: "seq_tap", index: targetSeq[0] }, "agent_b", state, secret);
    const failPatch = memoryEngine.handleAct({ t: "seq_tap", index: (targetSeq[1] + 1) % 4 }, "agent_b", state, secret);
    check(failPatch?.memoryFailures?.includes("agent_b") === true, "memory detects wrong glyph and records cipher lockout");
    Object.assign(state, failPatch);

    // Agent C also completes
    for (let step = 0; step < targetSeq.length; step++) {
      const patch = memoryEngine.handleAct({ t: "seq_tap", index: targetSeq[step] }, "agent_c", state, secret);
      Object.assign(state, patch);
    }

    check(memoryEngine.isRoundComplete!(state), "memory round complete when all agents finished or failed");

    // Evaluate scoring with time decay speed bonus
    secret.times = { agent_a: 1500, agent_c: 6000 };
    const evalResult = memoryEngine.evaluateRound(state, secret);
    // 10 base + up to 5 speed points:
    // agent_a: 1500ms -> speed bonus ~4 -> 14 pts
    // agent_c: 6000ms -> speed bonus ~2 -> 12 pts
    // agent_b: failed -> 0 pts
    check(evalResult.scores["agent_a"] >= 13, "memory awards base 10 + fast speed bonus for agent_a");
    check(evalResult.scores["agent_c"] >= 11, "memory awards base 10 + moderate speed bonus for agent_c");
    check(evalResult.scores["agent_a"] > evalResult.scores["agent_c"], "faster cipher replication earns higher score");
    check(evalResult.scores["agent_b"] === undefined, "failed cipher replication awards zero points");
    check(evalResult.winnerId === "agent_a", "fastest cipher decryptor declared round winner");

    // Bot simulation
    let botTappedIndex: number | null = null;
    memoryEngine.simulateBotTurn(players["agent_b"], { ...state, memoryInput: { agent_b: [0] }, memoryFailures: [] }, (act) => {
      if (act.t === "seq_tap") botTappedIndex = act.index;
    });
    check(botTappedIndex === targetSeq[1], "memory bot simulation replicates expected next glyph");
  }

  // =========================================================================
  // 5. Code Lab Speedrun Engine
  // =========================================================================
  section("modular game engines: Code Lab Speedrun");
  {
    const players = makePlayers("coder_alpha", "coder_beta", "coder_gamma");
    const secret: any = {};
    const init = cybercodeEngine.initRound(1, players, secret);
    check(init.codeChallengeId !== undefined, "cybercode initializes challenge ID");
    check(init.codeStarter !== undefined && init.codeStarter.length > 0, "cybercode initializes starter code");

    const state: GState = {
      game: "cybercode",
      phase: "play",
      round: 1,
      rounds: 3,
      host: "coder_alpha",
      players,
      codeChallengeId: init.codeChallengeId,
      codeStarter: init.codeStarter,
      codeResults: {},
      codeTimes: {},
      msg: "",
    };

    // First solver passes at 4500ms
    secret.startTime = 10000;
    const patch1 = cybercodeEngine.handleAct({ t: "code_submit", pass: true, ms: 4500 }, "coder_alpha", state, secret);
    check(patch1?.codeResults?.["coder_alpha"]?.pass === true, "cybercode records successful test pass");
    check(patch1?.codeTimes?.["coder_alpha"] === 4500, "cybercode records solve time");
    Object.assign(state, patch1);

    // Duplicate submission after pass rejected
    const patchDup = cybercodeEngine.handleAct({ t: "code_submit", pass: true }, "coder_alpha", state, secret);
    check(patchDup === null, "cybercode rejects submission after already passing");

    // Second solver passes at 7200ms
    const patch2 = cybercodeEngine.handleAct({ t: "code_submit", pass: true, ms: 7200 }, "coder_beta", state, secret);
    Object.assign(state, patch2);

    // Third player fails tests
    const patch3 = cybercodeEngine.handleAct({ t: "code_submit", pass: false, ms: 8000 }, "coder_gamma", state, secret);
    Object.assign(state, patch3);
    check(state.codeResults?.["coder_gamma"]?.pass === false, "cybercode records test failure status");

    // Evaluate scoring: First solver gets 15 pts, subsequent solvers get 8 pts, failed gets 0 pts
    secret.times = { coder_alpha: 4500, coder_beta: 7200 };
    const evalResult = cybercodeEngine.evaluateRound(state, secret);
    check(evalResult.scores["coder_alpha"] === 15, "first code solver receives 15 points");
    check(evalResult.scores["coder_beta"] === 8, "subsequent code solver receives 8 points");
    check(evalResult.scores["coder_gamma"] === undefined, "unsolved engineer receives zero points");
    check(evalResult.winnerId === "coder_alpha", "fastest code solver crowned winner");
    check(evalResult.msg.includes("Top engineer: CODER_ALPHA"), "cybercode announces top engineer in message");

    // Bot simulation
    let botCodePass = false;
    cybercodeEngine.simulateBotTurn(players["coder_gamma"], { ...state, codeResults: {} }, (act) => {
      if (act.t === "code_submit" && act.pass) botCodePass = true;
    }, secret);
    check(botCodePass, "cybercode bot simulation submits passing solution");
  }
}
