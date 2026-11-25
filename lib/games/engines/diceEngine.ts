import type { Act, EngineContext, GameEngine, GPlayer, GState, RoundEvaluation } from "@/lib/games/types";

export const diceEngine: GameEngine = {
  id: "dice",
  name: "Cyber Dice Duel",

  initRound(_round: number, _currentPlayers: Record<string, GPlayer> | GPlayer[]): Partial<GState> {
    return {
      rolls: {},
      multipliers: {},
      msg: "Roll!",
    };
  },

  onRoundStart(state: GState, _secret: any, ctx: EngineContext): void {
    ctx.later(() => ctx.finishRound(), 15000);

    const ids = Object.keys(state.players);
    const botIds = ids.filter((id) => id.startsWith("bot_"));
    botIds.forEach((botId) => {
      ctx.later(() => {
        ctx.dispatchAct(botId, { t: "roll" });
      }, 1000 + Math.random() * 2000);
    });
  },

  handleAct(action: Act, playerId: string, state: GState): Partial<GState> | null {
    if (action.t !== "roll") return null;
    const rolls = { ...(state.rolls || {}) };
    if (rolls[playerId]) return null;

    // Roll 1-6 with quantum resonance multiplier (doubles trigger 2x, critical 6 triggers multiplier)
    const r1 = 1 + Math.floor(Math.random() * 6);
    const r2 = 1 + Math.floor(Math.random() * 6);
    const multiplier = r1 === 6 ? 2 : r1 === r2 ? 2 : 1;

    rolls[playerId] = r1;
    const multipliers = { ...(state.multipliers || {}), [playerId]: multiplier };

    return { rolls, multipliers };
  },

  isRoundComplete(state: GState): boolean {
    const activeIds = Object.keys(state.players).filter((id) => state.players[id]?.role !== "spectator");
    return activeIds.length > 0 && activeIds.every((id) => state.rolls?.[id] !== undefined);
  },

  evaluateRound(state: GState): RoundEvaluation {
    const rolls = { ...(state.rolls || {}) };
    const activeIds = Object.keys(state.players).filter((id) => state.players[id]?.role !== "spectator");

    // Assign fallback rolls for any unrolled players
    activeIds.forEach((id) => {
      if (!rolls[id]) rolls[id] = 1 + Math.floor(Math.random() * 6);
    });
    state.rolls = rolls;

    const max = activeIds.length ? Math.max(...activeIds.map((id) => rolls[id] || 0)) : 0;
    const scores: Record<string, number> = {};
    const winners: string[] = [];

    activeIds.forEach((id) => {
      if (rolls[id] === max) {
        const mult = state.multipliers?.[id] || 1;
        scores[id] = 1 * mult;
        winners.push(id);
      }
    });

    return {
      scores,
      msg: "Highest roll: " + max,
      winnerId: winners[0],
      winners,
      telemetry: { rolls, max, multipliers: state.multipliers },
    };
  },

  simulateBotTurn(bot: GPlayer, state: GState, dispatchAct: (act: Act) => void): void {
    if (!state.rolls?.[bot.id]) {
      dispatchAct({ t: "roll" });
    }
  },
};
