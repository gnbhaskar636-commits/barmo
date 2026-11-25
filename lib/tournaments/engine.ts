import type { GameId } from "@/lib/games/types";
import { advanceWinnerInBracket, generateBracket, findMatch } from "./brackets";
import type {
  Tournament,
  TournamentMatch,
  TournamentParticipant,
  TournamentPrize,
  TournamentRound,
  TournamentStatus,
} from "./types";

export function resolveTie(
  p1: TournamentParticipant,
  p2: TournamentParticipant,
  method: "seed" | "sudden_death" = "seed"
): TournamentParticipant {
  if (method === "seed") {
    // Lower numerical seed is the higher rank (e.g. Seed 1 > Seed 8)
    return p1.seed <= p2.seed ? p1 : p2;
  }
  // Fallback to p1
  return p1;
}

export function calculatePrizePool(
  prizePool: number,
  rankedParticipants: TournamentParticipant[] = []
): TournamentPrize[] {
  const pool = Math.max(0, Number.isFinite(prizePool) ? prizePool : 0);
  const distribution = [
    { rank: 1, label: "1st Place (Champion)", pct: 0.60 },
    { rank: 2, label: "2nd Place (Runner-up)", pct: 0.25 },
    { rank: 3, label: "3rd Place (Semifinalist)", pct: 0.10 },
    { rank: 4, label: "4th Place (Semifinalist)", pct: 0.05 },
  ];

  let remaining = pool;
  const prizes: TournamentPrize[] = distribution.map((d, i) => {
    const isLast = i === distribution.length - 1;
    const tokens = isLast
      ? Math.max(0, remaining)
      : Math.min(Math.max(0, remaining), Math.round(pool * d.pct));
    remaining = Math.max(0, remaining - tokens);
    const p = rankedParticipants[i];
    return {
      rank: d.rank,
      label: d.label,
      percentage: d.pct * 100,
      tokens,
      participantId: p?.id,
      participantName: p?.name,
    };
  });

  return prizes;
}

export function generateMatchRoomCode(tournamentId: string, matchIndex: number): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `TR${matchIndex + 1}${suffix}`.slice(0, 8);
}

export function verifyMatchResult(
  tournament: Tournament,
  matchId: string,
  score1: number,
  score2: number,
  declaredWinnerId?: string
): { valid: boolean; reason?: string; winnerId: string; winnerParticipant?: TournamentParticipant } {
  const match = findMatch(tournament.rounds, matchId);
  if (!match) {
    return { valid: false, reason: `Match ${matchId} not found`, winnerId: "" };
  }
  if (!match.p1 || !match.p2) {
    return { valid: false, reason: "Match participants incomplete", winnerId: "" };
  }
  if (!Number.isFinite(score1) || !Number.isFinite(score2) || score1 < 0 || score2 < 0) {
    return { valid: false, reason: "Scores must be non-negative numbers", winnerId: "" };
  }

  let verifiedWinner: TournamentParticipant;
  if (score1 > score2) {
    verifiedWinner = match.p1;
  } else if (score2 > score1) {
    verifiedWinner = match.p2;
  } else {
    // Tie resolution via seed
    verifiedWinner = resolveTie(match.p1, match.p2, "seed");
  }

  if (declaredWinnerId && declaredWinnerId !== verifiedWinner.id) {
    return {
      valid: false,
      reason: `Declared winner ${declaredWinnerId} does not match verified score outcome ${verifiedWinner.id}`,
      winnerId: verifiedWinner.id,
      winnerParticipant: verifiedWinner,
    };
  }

  return {
    valid: true,
    winnerId: verifiedWinner.id,
    winnerParticipant: verifiedWinner,
  };
}

export function calculateSpeedrunLadder(
  entries: { id: string; name: string; timeMs: number }[]
): { rank: number; id: string; name: string; timeMs: number }[] {
  return [...entries]
    .sort((a, b) =>
      a.timeMs !== b.timeMs ? a.timeMs - b.timeMs : (a.id || "").localeCompare(b.id || "")
    )
    .map((entry, idx) => ({
      rank: idx + 1,
      ...entry,
    }));
}

// ---------------------------------------------------------------------------
// Tournament Store & In-Memory State
// ---------------------------------------------------------------------------

function createInitialTournaments(): Tournament[] {
  // 1. Cyber Neon Championship (8 teams, live in semifinals)
  const pCyber: TournamentParticipant[] = [
    { id: "p-vega", name: "Commander Vega", seed: 1, avatar: "atlas", team: "neon" },
    { id: "p-viper", name: "CyberViper", seed: 8, avatar: "sage", team: "cyber" },
    { id: "p-ace", name: "Quantum_Ace", seed: 4, avatar: "slate", team: "sol" },
    { id: "p-glitch", name: "GlitchHunter", seed: 5, avatar: "clay", team: "neon" },
    { id: "p-blade", name: "NeonBlade", seed: 2, avatar: "atlas", team: "cyber" },
    { id: "p-rider", name: "SolRider", seed: 7, avatar: "sage", team: "sol" },
    { id: "p-hyper", name: "Hyperion", seed: 3, avatar: "slate", team: "neon" },
    { id: "p-synapse", name: "Synapse", seed: 6, avatar: "clay", team: "cyber" },
  ];

  const roundsCyber = generateBracket("tourney-cyber-neon", "dice", 8, pCyber);
  // Simulate Quarterfinals completed
  // QF1: Vega vs Viper (Vega wins)
  advanceWinnerInBracket(roundsCyber, "tourney-cyber-neon-r1-m1", "p-vega", 18, 12);
  // QF2: Quantum_Ace vs GlitchHunter (GlitchHunter wins)
  advanceWinnerInBracket(roundsCyber, "tourney-cyber-neon-r1-m2", "p-glitch", 14, 16);
  // QF3: NeonBlade vs SolRider (NeonBlade wins)
  advanceWinnerInBracket(roundsCyber, "tourney-cyber-neon-r1-m3", "p-blade", 21, 15);
  // QF4: Hyperion vs Synapse (Hyperion wins)
  advanceWinnerInBracket(roundsCyber, "tourney-cyber-neon-r1-m4", "p-hyper", 19, 13);

  // Set Semifinal 1 to Live
  const sf1 = findMatch(roundsCyber, "tourney-cyber-neon-r2-m1");
  if (sf1) {
    sf1.status = "live";
    sf1.roomCode = "CYBER88";
    sf1.startedAt = Date.now() - 120000;
  }
  const sf2 = findMatch(roundsCyber, "tourney-cyber-neon-r2-m2");
  if (sf2) {
    sf2.status = "scheduled";
    sf2.roomCode = "CYBER89";
  }

  // 2. Quantum Speedrun Grand Prix (16 teams, upcoming)
  const pSpeedrun: TournamentParticipant[] = [
    { id: "p-chrono", name: "ChronoDrift", seed: 1, avatar: "atlas", team: "neon" },
    { id: "p-tachyon", name: "TachyonX", seed: 16, avatar: "sage", team: "cyber" },
    { id: "p-pulse", name: "PulseFire", seed: 8, avatar: "slate", team: "sol" },
    { id: "p-warp", name: "WarpSpeed", seed: 9, avatar: "clay", team: "neon" },
    { id: "p-nitro", name: "NitroGhost", seed: 4, avatar: "atlas", team: "cyber" },
    { id: "p-apex", name: "ApexRacer", seed: 13, avatar: "sage", team: "sol" },
    { id: "p-subzero", name: "SubZero", seed: 5, avatar: "slate", team: "neon" },
    { id: "p-ion", name: "IonSurge", seed: 12, avatar: "clay", team: "cyber" },
    { id: "p-mach", name: "MachNine", seed: 2, avatar: "atlas", team: "sol" },
    { id: "p-slip", name: "SlipStreamer", seed: 15, avatar: "sage", team: "neon" },
    { id: "p-velocity", name: "VelocityPrime", seed: 7, avatar: "slate", team: "cyber" },
    { id: "p-flare", name: "SolarFlare", seed: 10, avatar: "clay", team: "sol" },
  ];
  const roundsSpeedrun = generateBracket("tourney-quantum-speedrun", "race", 16, pSpeedrun);

  // 3. Neural Quiz Blitz Arena (8 teams, upcoming)
  const pQuiz: TournamentParticipant[] = [
    { id: "p-axiom", name: "AxiomMind", seed: 1, avatar: "atlas", team: "neon" },
    { id: "p-cortex", name: "CortexPrime", seed: 4, avatar: "sage", team: "cyber" },
    { id: "p-logic", name: "LogicGate", seed: 5, avatar: "slate", team: "sol" },
    { id: "p-brain", name: "BrainWave", seed: 2, avatar: "clay", team: "neon" },
    { id: "p-memory", name: "MemoryByte", seed: 3, avatar: "atlas", team: "cyber" },
    { id: "p-oracle", name: "OracleNova", seed: 6, avatar: "sage", team: "sol" },
  ];
  const roundsQuiz = generateBracket("tourney-neural-blitz", "quiz", 8, pQuiz);

  // 4. Matrix Cipher Lockdown (8 teams, completed)
  const pMatrix: TournamentParticipant[] = [
    { id: "p-cipher", name: "CipherMaster", seed: 1, avatar: "atlas", team: "neon" },
    { id: "p-key", name: "KeySmith", seed: 8, avatar: "sage", team: "cyber" },
    { id: "p-hash", name: "HashHound", seed: 4, avatar: "slate", team: "sol" },
    { id: "p-root", name: "RootAccess", seed: 5, avatar: "clay", team: "neon" },
    { id: "p-zero", name: "ZeroCool", seed: 2, avatar: "atlas", team: "cyber" },
    { id: "p-null", name: "NullPointer", seed: 7, avatar: "sage", team: "sol" },
    { id: "p-kernel", name: "KernelPanic", seed: 3, avatar: "slate", team: "neon" },
    { id: "p-byte", name: "ByteStorm", seed: 6, avatar: "clay", team: "cyber" },
  ];
  const roundsMatrix = generateBracket("tourney-matrix-cipher", "memory", 8, pMatrix);
  // Complete tournament
  advanceWinnerInBracket(roundsMatrix, "tourney-matrix-cipher-r1-m1", "p-cipher", 4, 1);
  advanceWinnerInBracket(roundsMatrix, "tourney-matrix-cipher-r1-m2", "p-hash", 4, 3);
  advanceWinnerInBracket(roundsMatrix, "tourney-matrix-cipher-r1-m3", "p-zero", 4, 2);
  advanceWinnerInBracket(roundsMatrix, "tourney-matrix-cipher-r1-m4", "p-kernel", 4, 0);
  advanceWinnerInBracket(roundsMatrix, "tourney-matrix-cipher-r2-m1", "p-cipher", 5, 3);
  advanceWinnerInBracket(roundsMatrix, "tourney-matrix-cipher-r2-m2", "p-zero", 5, 4);
  const matrixFinalRes = advanceWinnerInBracket(roundsMatrix, "tourney-matrix-cipher-r3-m1", "p-cipher", 6, 4);

  return [
    {
      id: "tourney-cyber-neon",
      title: "Cyber Neon Championship",
      game: "dice",
      gameTitle: "Cyber Dice Duel",
      gameIcon: "🎲",
      size: 8,
      status: "active",
      rounds: roundsCyber,
      participants: pCyber,
      maxParticipants: 8,
      prizePool: 10000,
      entryFee: "Free",
      date: "TODAY · LIVE Semifinals",
      format: "Single Elimination",
      bannerGradient: "linear-gradient(135deg, rgba(139,92,246,0.35), rgba(6,182,212,0.25))",
      prizes: calculatePrizePool(10000, [pCyber[0], pCyber[4]]),
    },
    {
      id: "tourney-quantum-speedrun",
      title: "Quantum Speedrun Grand Prix",
      game: "race",
      gameTitle: "Quantum Warp Grand Prix",
      gameIcon: "🏎️",
      size: 16,
      status: "upcoming",
      rounds: roundsSpeedrun,
      participants: pSpeedrun,
      maxParticipants: 16,
      prizePool: 25000,
      entryFee: "50 Tokens",
      date: "TODAY · 20:00 UTC",
      format: "Single Elimination",
      bannerGradient: "linear-gradient(135deg, rgba(245,158,11,0.35), rgba(244,63,94,0.3))",
      prizes: calculatePrizePool(25000, pSpeedrun),
    },
    {
      id: "tourney-neural-blitz",
      title: "Neural Blitz Arena",
      game: "quiz",
      gameTitle: "Neural Quiz Arena",
      gameIcon: "🧠",
      size: 8,
      status: "upcoming",
      rounds: roundsQuiz,
      participants: pQuiz,
      maxParticipants: 8,
      prizePool: 15000,
      entryFee: "Free",
      date: "TOMORROW · 18:00 UTC",
      format: "Speedrun Ladder",
      bannerGradient: "linear-gradient(135deg, rgba(6,182,212,0.35), rgba(16,185,129,0.25))",
      prizes: calculatePrizePool(15000, pQuiz),
    },
    {
      id: "tourney-matrix-cipher",
      title: "Matrix Cipher Lockdown",
      game: "memory",
      gameTitle: "Matrix Memory Lock",
      gameIcon: "🧩",
      size: 8,
      status: "completed",
      rounds: roundsMatrix,
      participants: pMatrix,
      maxParticipants: 8,
      prizePool: 8000,
      entryFee: "Free",
      date: "YESTERDAY · Completed",
      format: "Single Elimination",
      bannerGradient: "linear-gradient(135deg, rgba(16,185,129,0.3), rgba(6,182,212,0.2))",
      winnerId: "p-cipher",
      winner: matrixFinalRes.tournamentWinner || pMatrix[0],
      prizes: calculatePrizePool(8000, [pMatrix[0], pMatrix[4], pMatrix[2], pMatrix[6]]),
    },
  ];
}

class TournamentStore {
  private tournaments: Map<string, Tournament> = new Map();

  constructor() {
    this.reset();
  }

  public reset() {
    this.tournaments.clear();
    createInitialTournaments().forEach((t) => this.tournaments.set(t.id, t));
  }

  public getAll(): Tournament[] {
    return Array.from(this.tournaments.values());
  }

  public get(id: string): Tournament | undefined {
    return this.tournaments.get(id);
  }

  public create(
    params: Partial<Tournament> & {
      id?: string;
      title: string;
      game: GameId;
      size: 8 | 16;
      prizePool: number;
    }
  ): Tournament {
    const id = params.id || `tourney-${Date.now()}`;
    const initialParticipants = params.participants || [];
    const rounds = generateBracket(id, params.game, params.size, initialParticipants);

    const tournament: Tournament = {
      id,
      title: params.title,
      game: params.game,
      gameTitle: params.gameTitle || params.title,
      gameIcon: params.gameIcon || "🏆",
      size: params.size,
      status: params.status || "upcoming",
      rounds,
      participants: [...initialParticipants],
      maxParticipants: params.maxParticipants || params.size,
      prizePool: params.prizePool,
      entryFee: params.entryFee || "Free",
      date: params.date || "Scheduled Soon",
      format: params.format || "Single Elimination",
      bannerGradient: params.bannerGradient,
      prizes: calculatePrizePool(params.prizePool, initialParticipants),
    };

    this.tournaments.set(id, tournament);
    return tournament;
  }

  public register(
    tournamentId: string,
    user: { id: string; name: string; avatar?: string; team?: "neon" | "cyber" | "sol" }
  ): { success: boolean; participant?: TournamentParticipant; tournament: Tournament; message: string } {
    const t = this.tournaments.get(tournamentId);
    if (!t) {
      throw new Error(`Tournament ${tournamentId} not found`);
    }

    if (t.participants.some((p) => p.id === user.id)) {
      return {
        success: false,
        tournament: t,
        message: "Already registered for this tournament",
      };
    }

    if (t.participants.length >= t.maxParticipants) {
      return {
        success: false,
        tournament: t,
        message: "Tournament roster is completely full",
      };
    }

    const seed = t.participants.length + 1;
    const participant: TournamentParticipant = {
      id: user.id,
      name: user.name,
      seed,
      avatar: user.avatar || "atlas",
      team: user.team || "neon",
    };

    t.participants.push(participant);
    // Regenerate bracket with new participant
    t.rounds = generateBracket(t.id, t.game, t.size, t.participants);
    t.prizes = calculatePrizePool(t.prizePool, t.participants);

    return {
      success: true,
      participant,
      tournament: t,
      message: `Registered for ${t.title} with seed #${seed}!`,
    };
  }

  public launchMatch(tournamentId: string, matchId: string): TournamentMatch {
    const t = this.tournaments.get(tournamentId);
    if (!t) throw new Error(`Tournament ${tournamentId} not found`);

    const match = findMatch(t.rounds, matchId);
    if (!match) throw new Error(`Match ${matchId} not found`);
    if (!match.p1 || !match.p2) {
      throw new Error("Cannot launch match without both participants assigned");
    }

    if (!match.roomCode) {
      match.roomCode = generateMatchRoomCode(tournamentId, match.matchIndex);
    }
    match.status = "live";
    match.startedAt = Date.now();
    t.status = "active";

    return match;
  }

  public advanceWinner(
    tournamentId: string,
    matchId: string,
    winnerId: string,
    score1 = 0,
    score2 = 0
  ): {
    tournament: Tournament;
    match: TournamentMatch;
    nextMatch?: TournamentMatch;
    tournamentWinner?: TournamentParticipant;
  } {
    const t = this.tournaments.get(tournamentId);
    if (!t) throw new Error(`Tournament ${tournamentId} not found`);

    const match = findMatch(t.rounds, matchId);
    if (!match) throw new Error(`Match ${matchId} not found`);

    const result = advanceWinnerInBracket(t.rounds, matchId, winnerId, score1, score2);

    if (result.tournamentWinner) {
      t.status = "completed";
      t.winnerId = result.tournamentWinner.id;
      t.winner = result.tournamentWinner;

      // Update prizes with final standings
      const runnerUp = match.p1?.id === winnerId ? match.p2 : match.p1;
      const ranked = [result.tournamentWinner];
      if (runnerUp) ranked.push(runnerUp);
      t.prizes = calculatePrizePool(t.prizePool, ranked);
    }

    return {
      tournament: t,
      match,
      nextMatch: result.nextMatch,
      tournamentWinner: result.tournamentWinner,
    };
  }
}

// Global Singleton Store
export const tournamentStore = new TournamentStore();

export function getTournaments(): Tournament[] {
  return tournamentStore.getAll();
}

export function getTournament(id: string): Tournament | undefined {
  return tournamentStore.get(id);
}

export function registerParticipant(
  tournamentId: string,
  user: { id: string; name: string; avatar?: string; team?: "neon" | "cyber" | "sol" }
) {
  return tournamentStore.register(tournamentId, user);
}

export function launchTournamentMatch(tournamentId: string, matchId: string): TournamentMatch {
  return tournamentStore.launchMatch(tournamentId, matchId);
}

export function advanceTournamentWinner(
  tournamentId: string,
  matchId: string,
  winnerId: string,
  score1 = 0,
  score2 = 0
) {
  return tournamentStore.advanceWinner(tournamentId, matchId, winnerId, score1, score2);
}
