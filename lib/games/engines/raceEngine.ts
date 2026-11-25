import type { Act, EngineContext, GameEngine, GPlayer, GState, RoundEvaluation } from "@/lib/games/types";

export const raceEngine: GameEngine = {
  id: "race",
  name: "Quantum Warp Grand Prix",

  initRound(_round: number, _currentPlayers: Record<string, GPlayer> | GPlayer[], secret?: any): Partial<GState> {
    if (secret) {
      secret.times = {};
      secret.goAt = 0;
    }

    return {
      rs: "wait",
      taps: [],
      early: [],
      times: undefined,
      speeds: undefined,
      nitro: undefined,
      slips: undefined,
      msg: "Quantum warp gate charging… Hold for neon flare!",
    };
  },

  onRoundStart(state: GState, secret: any, ctx: EngineContext): void {
    const delay = 2200 + Math.random() * 2600;
    ctx.later(() => {
      if (state.phase !== "play") return;
      state.rs = "go";
      state.msg = "⚡ HYPERDRIVE FLARE! TAP NOW!";
      secret.goAt = Date.now();
      ctx.push();

      // Trigger AI Bot reaction taps
      const ids = Object.keys(state.players);
      const botIds = ids.filter((id) => id.startsWith("bot_"));
      botIds.forEach((botId) => {
        const botReaction = 175 + Math.random() * 170;
        ctx.later(() => {
          ctx.dispatchAct(botId, { t: "tap" });
        }, botReaction);
      });

      ctx.later(() => ctx.finishRound(), 3000);
    }, delay);
  },

  handleAct(action: Act, playerId: string, state: GState, secret?: any): Partial<GState> | null {
    if (action.t !== "tap") return null;

    const taps = [...(state.taps || [])];
    const early = [...(state.early || [])];
    if (taps.includes(playerId) || early.includes(playerId)) return null;

    if (state.rs === "wait") {
      early.push(playerId);
      return { early };
    }

    taps.push(playerId);
    if (secret) {
      if (!secret.times) secret.times = {};
      if (secret.times[playerId] === undefined) {
        const goAt = secret.goAt || Date.now();
        secret.times[playerId] = Math.max(0, Date.now() - goAt);
      }
    }

    return { taps };
  },

  isRoundComplete(state: GState): boolean {
    const activeIds = Object.keys(state.players).filter((id) => state.players[id]?.role !== "spectator");
    const taps = state.taps || [];
    const early = state.early || [];
    return activeIds.length > 0 && activeIds.every((id) => taps.includes(id) || early.includes(id));
  },

  evaluateRound(state: GState, secret?: any): RoundEvaluation {
    const speeds: Record<string, string> = {};
    const nitro: Record<string, boolean> = {};
    const slips: Record<string, string> = {};
    const taps = state.taps || [];
    const scores: Record<string, number> = {};
    const times = { ...(secret?.times || state.times || {}) };

    taps.forEach((id, i) => {
      const ms = times[id] ?? 999;
      if (ms < 160) {
        speeds[id] = "Mach 8.8 (3,000 km/h)";
        nitro[id] = true;
        scores[id] = (scores[id] || 0) + 5;
      } else if (ms < 250) {
        speeds[id] = "Mach 5.4 (1,840 km/h)";
        scores[id] = (scores[id] || 0) + 3;
      } else if (ms < 400) {
        speeds[id] = "Mach 3.2 (1,080 km/h)";
        scores[id] = (scores[id] || 0) + 2;
      } else {
        speeds[id] = "Mach 1.4 (480 km/h)";
        scores[id] = (scores[id] || 0) + 1;
      }

      // Quantum Slipstream Drafting: if trailing racer is within 120ms of lead
      if (i > 0) {
        const leadId = taps[i - 1];
        const leadMs = times[leadId] ?? 0;
        if (ms - leadMs < 120) {
          slips[id] = state.players[leadId]?.name || "Rival";
          scores[id] = (scores[id] || 0) + 1; // bonus draft recovery point
        }
      }
    });

    state.times = times;
    state.speeds = speeds;
    state.nitro = nitro;
    state.slips = slips;

    const msg = taps.length
      ? `🏆 P1: ${state.players[taps[0]]?.name || "?"} at ${times[taps[0]]}ms (${speeds[taps[0]] || "Hyperdrive"})!`
      : "Quantum gate closed before warp breach.";

    const winnerId = taps[0];
    const winners = taps.length ? [taps[0]] : [];

    return {
      scores,
      msg,
      winnerId,
      winners,
      telemetry: { speeds, nitro, slips, times },
    };
  },

  simulateBotTurn(bot: GPlayer, state: GState, dispatchAct: (act: Act) => void): void {
    if (!state.taps?.includes(bot.id) && !state.early?.includes(bot.id)) {
      dispatchAct({ t: "tap" });
    }
  },
};
