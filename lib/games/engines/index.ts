import type { GameEngine, GameId } from "@/lib/games/types";
import { diceEngine } from "./diceEngine";
import { quizEngine } from "./quizEngine";
import { raceEngine } from "./raceEngine";
import { memoryEngine } from "./memoryEngine";
import { cybercodeEngine } from "./cybercodeEngine";

export { diceEngine, quizEngine, raceEngine, memoryEngine, cybercodeEngine };

export const engines: Record<GameId, GameEngine> = {
  dice: diceEngine,
  quiz: quizEngine,
  race: raceEngine,
  memory: memoryEngine,
  cybercode: cybercodeEngine,
};

export function getEngine(gameId: GameId): GameEngine {
  const engine = engines[gameId];
  if (!engine) {
    return diceEngine;
  }
  return engine;
}

export function allEngines(): GameEngine[] {
  return [diceEngine, quizEngine, raceEngine, memoryEngine, cybercodeEngine];
}
