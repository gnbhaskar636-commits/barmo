import type { Act, EngineContext, GameEngine, GPlayer, GState, RoundEvaluation } from "@/lib/games/types";

export const memoryEngine: GameEngine = {
  id: "memory",
  name: "Matrix Memory Lock",

  initRound(round: number, _currentPlayers: Record<string, GPlayer> | GPlayer[], secret?: any): Partial<GState> {
    // Escalating sequence length: Round 1 = 3, Round 2 = 4, Round 3 = 5, Round 4 = 6
    const seqLen = Math.min(3 + Math.max(0, round - 1), 8);
    const seq: number[] = [];
    for (let i = 0; i < seqLen; i++) {
      seq.push(Math.floor(Math.random() * 4));
    }

    if (secret) {
      secret.memorySeq = seq;
      secret.inputStart = 0;
      secret.times = {};
    }

    return {
      memorySeq: seq,
      memoryInput: {},
      memoryRound: round,
      memoryPhase: "watch",
      memoryFailures: [],
      memoryTimes: {},
      msg: "Memorize the Matrix Cipher sequence...",
    };
  },

  onRoundStart(state: GState, secret: any, ctx: EngineContext): void {
    const seqLen = state.memorySeq?.length || 3;
    const watchDuration = seqLen * 650 + 600;

    // Transition from watch to input phase
    ctx.later(() => {
      if (state.phase !== "play") return;
      state.memoryPhase = "input";
      state.msg = "Replicate the cipher sequence!";
      secret.inputStart = Date.now();
      ctx.push();

      // Bot simulation
      const ids = Object.keys(state.players);
      const botIds = ids.filter((id) => id.startsWith("bot_"));
      const seq = state.memorySeq || [];

      botIds.forEach((botId) => {
        const isSuccessful = Math.random() < 0.85;
        const failAt = isSuccessful ? -1 : Math.floor(Math.random() * seq.length);

        seq.forEach((correctGlyph, stepIdx) => {
          const delay = (stepIdx + 1) * (380 + Math.random() * 160);
          ctx.later(() => {
            if (state.memoryPhase !== "input") return;
            const glyph = stepIdx === failAt ? (correctGlyph + 1) % 4 : correctGlyph;
            ctx.dispatchAct(botId, { t: "seq_tap", index: glyph });
          }, delay);
        });
      });

      // 10s maximum input window
      ctx.later(() => ctx.finishRound(), 10500);
    }, watchDuration);
  },

  handleAct(action: Act, playerId: string, state: GState, secret?: any): Partial<GState> | null {
    if (action.t !== "seq_tap") return null;
    const glyphIndex = action.index;
    if (typeof glyphIndex !== "number" || glyphIndex < 0 || glyphIndex > 3) return null;
    if (state.memoryPhase !== "input") return null;

    const failures = [...(state.memoryFailures || [])];
    if (failures.includes(playerId)) return null;

    const currentInputs = { ...(state.memoryInput || {}) };
    const playerSteps = [...(currentInputs[playerId] || [])];
    const seq = state.memorySeq || [];

    if (playerSteps.length >= seq.length) return null; // Already finished

    const expected = seq[playerSteps.length];
    if (glyphIndex !== expected) {
      failures.push(playerId);
      return { memoryFailures: failures };
    }

    playerSteps.push(glyphIndex);
    currentInputs[playerId] = playerSteps;

    const memoryTimes = { ...(state.memoryTimes || {}) };
    if (playerSteps.length === seq.length) {
      const start = secret?.inputStart || Date.now();
      const elapsed = Math.max(0, Date.now() - start);
      memoryTimes[playerId] = elapsed;
      if (secret) {
        if (!secret.times) secret.times = {};
        secret.times[playerId] = elapsed;
      }
    }

    return { memoryInput: currentInputs, memoryTimes };
  },

  isRoundComplete(state: GState): boolean {
    const activeIds = Object.keys(state.players).filter((id) => state.players[id]?.role !== "spectator");
    const seqLen = state.memorySeq?.length || 0;
    const failures = state.memoryFailures || [];
    const inputs = state.memoryInput || {};

    return activeIds.length > 0 && activeIds.every((id) => failures.includes(id) || (inputs[id]?.length || 0) === seqLen);
  },

  evaluateRound(state: GState, secret?: any): RoundEvaluation {
    const seqLen = state.memorySeq?.length || 0;
    const ids = Object.keys(state.players);
    const failures = state.memoryFailures || [];
    const inputs = state.memoryInput || {};
    const times = { ...(secret?.times || state.memoryTimes || {}) };
    const scores: Record<string, number> = {};

    ids.forEach((id) => {
      const pInputs = inputs[id] || [];
      const isFailed = failures.includes(id);

      if (!isFailed && pInputs.length === seqLen && seqLen > 0) {
        const ms = times[id] ?? 10000;
        // 10 base points + up to 5 speed points (decay over 10s)
        const speedBonus = Math.round((1 - Math.min(1, ms / 10000)) * 5);
        scores[id] = 10 + Math.max(0, speedBonus);
      }
    });

    const successful = ids.filter((id) => scores[id] !== undefined);
    successful.sort((a, b) => (times[a] ?? 99999) - (times[b] ?? 99999));

    const topDecryptor = successful[0];
    const topName = topDecryptor ? state.players[topDecryptor]?.name || "Operative" : "";
    const topTime = topDecryptor ? times[topDecryptor] : 0;
    const topPts = topDecryptor ? scores[topDecryptor] : 0;

    const msg = successful.length
      ? `🔐 Cipher unlocked! Top decryptor: ${topName} (${topTime}ms, +${topPts} pts)`
      : "Cipher lock engaged. Zero operatives completed sequence.";

    return {
      scores,
      msg,
      winnerId: topDecryptor,
      winners: successful,
      telemetry: { seq: state.memorySeq, times, failures },
    };
  },

  simulateBotTurn(bot: GPlayer, state: GState, dispatchAct: (act: Act) => void): void {
    if (state.memoryPhase !== "input") return;
    if (state.memoryFailures?.includes(bot.id)) return;

    const seq = state.memorySeq || [];
    const steps = state.memoryInput?.[bot.id] || [];
    if (steps.length < seq.length) {
      dispatchAct({ t: "seq_tap", index: seq[steps.length] });
    }
  },
};
