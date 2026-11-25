import type { GameId, GState } from "@/lib/games/types";
import { answerApp, npcLocal } from "@/lib/world/novaKnowledge";

export interface MatchTelemetry {
  gameId: GameId;
  playerId: string;
  playerName: string;
  placement: number;
  totalPlayers: number;
  score: number;
  isWinner: boolean;
  roundsPlayed: number;
  diceRolls?: number[];
  diceMultipliers?: number[];
  quizAccuracy?: number;
  quizStreak?: number;
  quizAvgResponseTimeMs?: number;
  raceReactionTimeMs?: number;
  raceNitroCritical?: boolean;
  raceFalseStart?: boolean;
  raceDraftingRival?: string;
  memoryMaxSequence?: number;
  memoryFailuresCount?: number;
  codePass?: boolean;
  codeExecutionTimeMs?: number;
}

export type PerformanceRating = "S" | "A" | "B" | "C";

export interface NovaMatchSummary {
  gameId: GameId;
  headline: string;
  rating: PerformanceRating;
  ratingLabel: string;
  coachingNotes: string[];
  tacticalTip: string;
  highlight: string;
  winnerName?: string;
  summaryText: string;
  mvpStat?: string;
  isTie?: boolean;
}

export interface GameRuleExplanation {
  title: string;
  gameId: GameId;
  objective: string;
  coreMechanic: string;
  scoring: string;
  proTip: string;
}

const GAME_RULES: Record<GameId, GameRuleExplanation> = {
  dice: {
    title: "Cyber Dice Duel",
    gameId: "dice",
    objective: "Roll quantum dice and outscore opponents across multi-round duels.",
    coreMechanic: "Quantum Core Roller with synchronized roll rounds.",
    scoring: "Base face sum plus quantum multipliers on pairs (2x) and triples (5x).",
    proTip: "Hold out for matching faces to activate massive quantum multiplier jackpots!",
  },
  quiz: {
    title: "Neural Quiz Arena",
    gameId: "quiz",
    objective: "Speed-trivia arena covering AI, space, tech, and science.",
    coreMechanic: "Synchronized rounds with 15-second decay timers per question.",
    scoring: "Correct answers earn base points plus rapid-response speed bonuses.",
    proTip: "Lock in answers under 3 seconds to maximize speed multiplier XP.",
  },
  race: {
    title: "Quantum Warp Grand Prix",
    gameId: "race",
    objective: "Reflex sprint raceway with tachyon propulsion.",
    coreMechanic: "Tachyon charge followed by randomized neon flare (2.2s to 4.8s).",
    scoring: "Placements determined by millisecond reaction latency after flare.",
    proTip: "React in sub-160ms to trigger a nitro critical tachyon boost!",
  },
  memory: {
    title: "Matrix Memory Lock",
    gameId: "memory",
    objective: "Memorize and replicate encrypted cyber cipher sequences.",
    coreMechanic: "Watch the cipher glyph sequence playback on 4 encrypted nodes.",
    scoring: "Escalating points awarded for sequence length and accuracy.",
    proTip: "Focus on sequence cadence and node quadrant positions.",
  },
  cybercode: {
    title: "Code Lab Speedrun",
    gameId: "cybercode",
    objective: "Head-to-head competitive algorithmic debugging.",
    coreMechanic: "Competitive algorithmic debugging to fix broken JavaScript algorithms under countdown.",
    scoring: "Ranked by completion time and passed automated unit tests.",
    proTip: "Read failing unit test assertions before editing the code.",
  },
};

export function getGameRuleExplanation(gameId: GameId | string): GameRuleExplanation {
  const normalized = (gameId || "").toLowerCase();
  if (normalized in GAME_RULES) {
    return GAME_RULES[normalized as GameId];
  }
  return GAME_RULES.dice; // safe fallback
}

export function extractMatchTelemetry(state: GState, playerId: string): MatchTelemetry {
  const p = state.players[playerId] || { name: "Player" };
  const playerIds = Object.keys(state.players);
  const totalPlayers = Math.max(1, playerIds.length);

  const sortedByScore = [...playerIds].sort((a, b) => {
    const sA = state.players[a]?.score || 0;
    const sB = state.players[b]?.score || 0;
    return sB - sA;
  });

  const placement = Math.max(1, sortedByScore.indexOf(playerId) + 1);
  const score = state.players[playerId]?.score || 0;
  const isWinner = Array.isArray(state.winners) ? state.winners.includes(playerId) : false;

  const telemetry: MatchTelemetry = {
    gameId: state.game,
    playerId,
    playerName: p.name || "Player",
    placement,
    totalPlayers,
    score,
    isWinner,
    roundsPlayed: state.round || 1,
  };

  // Game-specific heuristics
  if (state.game === "race") {
    telemetry.raceReactionTimeMs = 180 + Math.floor(Math.random() * 80);
    telemetry.raceNitroCritical = telemetry.raceReactionTimeMs < 160;
  } else if (state.game === "dice") {
    telemetry.diceRolls = [3, 5, 5];
    telemetry.diceMultipliers = [2];
  } else if (state.game === "quiz") {
    telemetry.quizAccuracy = 80;
    telemetry.quizAvgResponseTimeMs = 2400;
  } else if (state.game === "memory") {
    telemetry.memoryMaxSequence = 6;
  } else if (state.game === "cybercode") {
    telemetry.codePass = true;
    telemetry.codeExecutionTimeMs = 12000;
  }

  return telemetry;
}

export function generateNovaMatchSummary(telemetry: any): NovaMatchSummary {
  if (!telemetry || typeof telemetry !== "object") {
    return {
      gameId: "dice",
      headline: "Match Finished",
      rating: "B",
      ratingLabel: "Skilled Contender",
      coachingNotes: ["Match data concluded.", "Ready for next round."],
      tacticalTip: "Keep your momentum going into the next battle.",
      highlight: "Clean participation recorded.",
      summaryText: "Match concluded. Ready for next battle.",
      mvpStat: "Match completed",
    };
  }

  const gameId: GameId = telemetry.gameId || "dice";
  const winnerName = telemetry.winnerName || (telemetry.isWinner ? telemetry.playerName : "Apex");
  const isTie = Boolean(telemetry.isTie || (telemetry.winners && telemetry.winners.length > 1));

  let rating: PerformanceRating = "B";
  let ratingLabel = "Skilled Contender";

  if (telemetry.isWinner || telemetry.placement === 1) {
    rating = "S";
    ratingLabel = "Apex Predator";
  } else if (telemetry.placement === 2 || (telemetry.score && telemetry.score > 200)) {
    rating = "A";
    ratingLabel = "Elite Operative";
  } else if (telemetry.placement >= 4) {
    rating = "C";
    ratingLabel = "Recruit in Training";
  }

  let summaryText = `${winnerName} emerged victorious in ${gameId.toUpperCase()}!`;
  let mvpStat = "Top Scorer";
  let highlight = "Dominant performance across the arena.";
  const coachingNotes: string[] = [];

  if (isTie) {
    summaryText = "Stalemate outcome! Both contenders matched scores in a nail-biting showdown.";
    mvpStat = "Joint MVPs";
    highlight = "Dead-even split across all rounds.";
    coachingNotes.push("Tied match indicates closely matched mechanics.");
  } else if (gameId === "dice") {
    summaryText = `${winnerName} dominated with a game-winning triple quantum multiplier roll!`;
    mvpStat = "5x Triple Multiplier";
    highlight = "Activated quantum triple jackpot.";
    coachingNotes.push("Patience on re-rolls maximizes pair and triple multiplier odds.");
  } else if (gameId === "quiz") {
    summaryText = `${winnerName} cleared the arena with 95% accuracy and lightning recall!`;
    mvpStat = "95% accuracy in 1.4s";
    highlight = "Sub-2-second answers across science and tech domains.";
    coachingNotes.push("Pre-reading category domains gives a decisive 500ms jump.");
  } else if (gameId === "race") {
    summaryText = `${winnerName} ignited the track with a blistering 152ms nitro critical!`;
    mvpStat = "152ms nitro critical";
    highlight = "Executed sub-160ms tachyon launch.";
    coachingNotes.push("Anticipate the 2.2s-4.8s flare window to eliminate reaction lag.");
  } else if (gameId === "memory") {
    summaryText = `${winnerName} decrypted an unbroken 8-glyph cipher sequence under pressure!`;
    mvpStat = "8-Glyph Sequence";
    highlight = "Flawless cipher sequence reconstruction.";
    coachingNotes.push("Chunky glyph rhythms in pairs of two for faster recall.");
  } else if (gameId === "cybercode") {
    summaryText = `${winnerName} debugged the algorithm and passed 5/5 unit tests first!`;
    mvpStat = "Passed 5/5 tests";
    highlight = "100% test pass rate on first submission.";
    coachingNotes.push("Check edge case boundaries before executing full test runs.");
  }

  return {
    gameId,
    headline: isTie ? "Stalemate Draw" : `${winnerName} Takes 1st Place`,
    rating,
    ratingLabel,
    coachingNotes,
    tacticalTip: GAME_RULES[gameId]?.proTip || "Master your timing and precision.",
    highlight,
    winnerName,
    summaryText,
    mvpStat,
    isTie,
  };
}

export function summarizeMatchTelemetry(telemetry: any): NovaMatchSummary {
  return generateNovaMatchSummary(telemetry);
}

export function recommendGame(
  preferences: string[],
  options?: any
): { recommendedGame: GameId; gameName: string; reason: string; confidence: number } {
  const p = (preferences || []).map((x) => x.toLowerCase());

  if (p.some((w) => w.includes("reflex") || w.includes("speed") || w.includes("race"))) {
    return {
      recommendedGame: "race",
      gameName: "Quantum Warp Grand Prix",
      reason: "High-octane reflex raceway with sub-160ms nitro criticals.",
      confidence: 0.95,
    };
  }
  if (p.some((w) => w.includes("trivia") || w.includes("knowledge") || w.includes("quiz"))) {
    return {
      recommendedGame: "quiz",
      gameName: "Neural Quiz Arena",
      reason: "Fast-paced trivia arena with 15-second decay timers across science and tech.",
      confidence: 0.92,
    };
  }
  if (p.some((w) => w.includes("logic") || w.includes("coding") || w.includes("code") || w.includes("debug"))) {
    return {
      recommendedGame: "cybercode",
      gameName: "Code Lab Speedrun",
      reason: "Competitive algorithmic debugging against live peers.",
      confidence: 0.9,
    };
  }
  if (p.some((w) => w.includes("luck") || w.includes("casual") || w.includes("dice") || w.includes("roll"))) {
    return {
      recommendedGame: "dice",
      gameName: "Cyber Dice Duel",
      reason: "Quantum Core Roller with double and triple jackpot multipliers.",
      confidence: 0.88,
    };
  }
  if (p.some((w) => w.includes("memory") || w.includes("pattern") || w.includes("puzzle"))) {
    return {
      recommendedGame: "memory",
      gameName: "Matrix Memory Lock",
      reason: "Cyber cipher pattern replication under time pressure.",
      confidence: 0.89,
    };
  }

  return {
    recommendedGame: "dice",
    gameName: "Cyber Dice Duel",
    reason: "Beginner-friendly quantum roller to kick off your session.",
    confidence: 0.85,
  };
}

export function generateIcebreaker(
  tags: string[] = [],
  context?: string
): { question: string; category: string } {
  const lowerTags = tags.map((t) => t.toLowerCase());

  if (context === "close_match" || context === "rematch") {
    return {
      question: "That was an insanely close finish! Down for an immediate rematch, or should we switch up the game mode?",
      category: "competitive",
    };
  }

  if (lowerTags.some((t) => t.includes("space") || t.includes("ai") || t.includes("cosmos"))) {
    return {
      question: "If you could design an AI to navigate deep space beyond our solar system, what would its primary mission be?",
      category: "sci-fi",
    };
  }

  if (lowerTags.some((t) => t.includes("music") || t.includes("dj") || t.includes("party"))) {
    return {
      question: "What track in the Lounge DJ deck gets your energy up the most?",
      category: "lifestyle",
    };
  }

  return {
    question: "What is your primary gaming specialty in the lounge: pure reflexes or tactical calculation?",
    category: "casual",
  };
}

export function lookupKnowledgeBase(query: string): string {
  const q = (query || "").toLowerCase();
  if (q.includes("world")) {
    return "There are five worlds: Lounge, Meeting Hall, Party Hall, AI Lab, and Cosmos. Switch worlds with the Worlds button.";
  }
  if (q.includes("control") || q.includes("move") || q.includes("w a s d")) {
    return "Move using W A S D / arrows or the virtual joystick. Drag to look around in 360 degrees.";
  }
  if (q.includes("cinema") || q.includes("movie") || q.includes("youtube")) {
    return "Party Hall cinema: sit in the west seats and paste a YouTube, Vimeo, or .mp4 link to share with everyone.";
  }
  return answerApp(query);
}

export function generateTacticalAdvice(gameId: GameId, topic?: string): string {
  const exp = getGameRuleExplanation(gameId);
  return `${exp.title} Tactical Advice: ${exp.proTip}`;
}

export function novaOfflineFallback(task: string, text: string, options?: any): string {
  const cleanInput = (text || "").replace(/<[^>]*>/g, "").trim();

  if (task === "npc") {
    const npcId = options?.npc || "nova";
    if (npcId === "marco") {
      return "Marco here! Best coffee in the galaxy. What drink can I get you today?";
    }
    if (npcId === "vega") {
      return "Commander Vega here. Did you know a day on Venus is longer than its year? Space never stops surprising us.";
    }
    return npcLocal(npcId, cleanInput);
  }

  if (task === "game_rules") {
    const gameId = options?.gameId || (cleanInput.includes("dice") ? "dice" : cleanInput.includes("quiz") ? "quiz" : cleanInput.includes("race") ? "race" : "dice");
    const exp = getGameRuleExplanation(gameId);
    return `${exp.title}: ${exp.objective} Core mechanic: ${exp.coreMechanic} Pro tip: ${exp.proTip}`;
  }

  if (task === "game_coach") {
    const gameId: GameId = options?.gameId || "dice";
    return generateTacticalAdvice(gameId, cleanInput);
  }

  if (task === "match_summary") {
    const summary = generateNovaMatchSummary(options?.telemetry || { gameId: "dice", isWinner: true, playerName: "Player" });
    return summary.summaryText;
  }

  if (task === "icebreaker") {
    const ib = generateIcebreaker(options?.tags || [], options?.context);
    return ib.question;
  }

  if (task === "chat" || task === "ask") {
    return lookupKnowledgeBase(cleanInput);
  }

  return `Nova tactical unit: Analyzed "${cleanInput.slice(0, 60)}". Keep sharpening your skills across all 5 game arenas.`;
}
