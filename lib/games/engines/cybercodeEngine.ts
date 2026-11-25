import { CHALLENGES } from "@/lib/world/codeLab";
import type { Act, EngineContext, GameEngine, GPlayer, GState, RoundEvaluation } from "@/lib/games/types";

export const cybercodeEngine: GameEngine = {
  id: "cybercode",
  name: "Code Lab Speedrun",

  initRound(round: number, _currentPlayers: Record<string, GPlayer> | GPlayer[], secret?: any): Partial<GState> {
    // Select curated algorithmic challenges: round 1: sum, round 2: palin, round 3: max
    const pool = ["sum", "palin", "max", "reverse", "vowels", "fizz"];
    const challengeId = pool[(round - 1) % pool.length] || "sum";
    const challenge = CHALLENGES.find((c) => c.id === challengeId) || CHALLENGES[1];

    if (secret) {
      secret.startTime = Date.now();
      secret.times = {};
    }

    return {
      codeChallengeId: challenge.id,
      codeTitle: challenge.title,
      codeBrief: challenge.brief,
      codeStarter: challenge.starter,
      codeSubmissions: {},
      codeResults: {},
      codeTimes: {},
      msg: `Code Lab Speedrun: Patch "${challenge.title}"!`,
    };
  },

  onRoundStart(state: GState, secret: any, ctx: EngineContext): void {
    secret.startTime = Date.now();
    secret.times = {};

    // AI Bot speedrun solvers (5s to 11s)
    const ids = Object.keys(state.players);
    const botIds = ids.filter((id) => id.startsWith("bot_"));

    botIds.forEach((botId) => {
      const botDelay = 5000 + Math.random() * 6000;
      ctx.later(() => {
        if (state.phase !== "play") return;
        ctx.dispatchAct(botId, {
          t: "code_submit",
          pass: true,
          ms: Math.round(botDelay),
        });
      }, botDelay);
    });

    // 18.5s maximum round duration
    ctx.later(() => ctx.finishRound(), 18500);
  },

  handleAct(action: Act, playerId: string, state: GState, secret?: any): Partial<GState> | null {
    if (action.t !== "code_submit") return null;
    if (state.codeResults?.[playerId]?.pass) return null; // Already passed

    const codeResults = { ...(state.codeResults || {}) };
    const codeTimes = { ...(state.codeTimes || {}) };
    const codeSubmissions = { ...(state.codeSubmissions || {}) };

    const start = secret?.startTime || Date.now();
    const elapsed = action.ms ?? Math.max(0, Date.now() - start);

    if (action.pass) {
      codeResults[playerId] = { pass: true, timeMs: elapsed };
      codeTimes[playerId] = elapsed;
      codeSubmissions[playerId] = action.code || "solution_verified";
      if (secret) {
        if (!secret.times) secret.times = {};
        secret.times[playerId] = elapsed;
      }
    } else {
      codeResults[playerId] = { pass: false, error: "Test assertions failed", timeMs: elapsed };
    }

    return { codeResults, codeTimes, codeSubmissions };
  },

  isRoundComplete(state: GState): boolean {
    const activeIds = Object.keys(state.players).filter((id) => state.players[id]?.role !== "spectator");
    const results = state.codeResults || {};
    return activeIds.length > 0 && activeIds.every((id) => results[id]?.pass === true);
  },

  evaluateRound(state: GState, secret?: any): RoundEvaluation {
    const ids = Object.keys(state.players);
    const times = { ...(secret?.times || state.codeTimes || {}) };
    const results = state.codeResults || {};

    const solvers = ids.filter((id) => results[id]?.pass === true);
    solvers.sort((a, b) => (times[a] ?? 99999) - (times[b] ?? 99999));

    const scores: Record<string, number> = {};
    solvers.forEach((id, rank) => {
      // First solver gets 15 points; subsequent solvers get 8 points
      scores[id] = rank === 0 ? 15 : 8;
    });

    const first = solvers[0];
    const firstName = first ? state.players[first]?.name || "Coder" : "";
    const firstTime = first ? times[first] : 0;

    const msg = solvers.length
      ? `💻 Test suite passed! Top engineer: ${firstName} in ${firstTime}ms (+15 pts)!`
      : "Speedrun elapsed: zero successful patch submissions.";

    return {
      scores,
      msg,
      winnerId: first,
      winners: solvers,
      telemetry: { challengeId: state.codeChallengeId, times, results },
    };
  },

  simulateBotTurn(bot: GPlayer, state: GState, dispatchAct: (act: Act) => void, secret?: any): void {
    if (!state.codeResults?.[bot.id]?.pass) {
      const start = secret?.startTime || Date.now();
      const elapsed = Math.max(0, Date.now() - start);
      dispatchAct({ t: "code_submit", pass: true, ms: elapsed });
    }
  },
};
