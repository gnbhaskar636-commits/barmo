import { QUESTIONS, type Act, type EngineContext, type GameEngine, type GPlayer, type GState, type RoundEvaluation } from "@/lib/games/types";

export const quizEngine: GameEngine = {
  id: "quiz",
  name: "Neural Quiz Arena",

  initRound(_round: number, _currentPlayers: Record<string, GPlayer> | GPlayer[], secret?: any): Partial<GState> {
    if (!secret) secret = {};
    if (!secret.used) secret.used = [];
    if (!secret.times) secret.times = {};

    let idx = Math.floor(Math.random() * QUESTIONS.length);
    for (let i = 0; i < 20 && secret.used.includes(idx); i++) {
      idx = Math.floor(Math.random() * QUESTIONS.length);
    }
    secret.used.push(idx);

    const q = QUESTIONS[idx];
    // Shuffle options while privately remembering the correct index
    const order = q.o.map((_, i) => i).sort(() => Math.random() - 0.5);
    const shuffledOpts = order.map((i) => q.o[i]);
    secret.correct = order.indexOf(q.a);
    secret.t0 = Date.now();
    secret.times = {};

    return {
      q: { text: q.q, opts: shuffledOpts, dur: 12000 },
      answers: {},
      correct: undefined,
      msg: "",
    };
  },

  onRoundStart(state: GState, secret: any, ctx: EngineContext): void {
    ctx.later(() => ctx.finishRound(), 12500);

    const ids = Object.keys(state.players);
    const botIds = ids.filter((id) => id.startsWith("bot_"));
    botIds.forEach((botId) => {
      ctx.later(() => {
        const correct = secret?.correct ?? 0;
        const ans = Math.random() < 0.75 ? correct : Math.floor(Math.random() * 4);
        ctx.dispatchAct(botId, { t: "ans", i: ans });
      }, 2500 + Math.random() * 3500);
    });
  },

  handleAct(action: Act, playerId: string, state: GState, secret?: any): Partial<GState> | null {
    if (action.t !== "ans") return null;
    const answers = { ...(state.answers || {}) };
    if (answers[playerId] !== undefined || typeof action.i !== "number" || action.i < 0 || action.i > 3) {
      return null;
    }

    answers[playerId] = action.i;
    if (secret) {
      if (!secret.times) secret.times = {};
      if (secret.times[playerId] === undefined) {
        const t0 = secret.t0 || Date.now();
        secret.times[playerId] = Math.max(0, Date.now() - t0);
      }
    }

    return { answers };
  },

  isRoundComplete(state: GState): boolean {
    const activeIds = Object.keys(state.players).filter((id) => state.players[id]?.role !== "spectator");
    return activeIds.length > 0 && activeIds.every((id) => state.answers?.[id] !== undefined);
  },

  evaluateRound(state: GState, secret?: any): RoundEvaluation {
    const dur = state.q?.dur || 12000;
    const correct = secret?.correct ?? state.correct ?? 0;
    state.correct = correct;

    const ids = Object.keys(state.players);
    const scores: Record<string, number> = {};

    ids.forEach((id) => {
      if (state.answers?.[id] === correct) {
        const elapsed = secret?.times?.[id] || dur;
        scores[id] = 10 + Math.round((1 - Math.min(1, elapsed / dur)) * 5);
      }
    });

    const optText = state.q?.opts[correct] ?? "";
    const maxScore = Math.max(0, ...Object.values(scores));
    const winners = ids.filter((id) => (scores[id] || 0) === maxScore && maxScore > 0);

    return {
      scores,
      msg: "Correct answer: " + optText,
      winnerId: winners[0],
      winners,
      telemetry: { correct, times: secret?.times },
    };
  },

  simulateBotTurn(bot: GPlayer, _state: GState, dispatchAct: (act: Act) => void, secret?: any): void {
    const correct = secret?.correct ?? 0;
    const ans = Math.random() < 0.75 ? correct : Math.floor(Math.random() * 4);
    dispatchAct({ t: "ans", i: ans });
  },
};
