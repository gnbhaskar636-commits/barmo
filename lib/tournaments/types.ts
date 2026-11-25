import type { GameId } from "@/lib/games/types";

export interface TournamentParticipant {
  id: string;
  name: string;
  seed: number;
  avatar?: string;
  team?: "neon" | "cyber" | "sol";
  score?: number;
  rank?: number;
  eliminated?: boolean;
}

export type MatchStatus = "pending" | "scheduled" | "live" | "completed";

export interface TournamentMatch {
  id: string;
  matchId: string;
  round: number;
  matchIndex: number;
  p1?: TournamentParticipant | null;
  p2?: TournamentParticipant | null;
  score1?: number;
  score2?: number;
  winnerId?: string;
  status: MatchStatus;
  roomCode?: string;
  nextMatchId?: string;
  nextMatchSlot?: 1 | 2;
  gameId: GameId;
  startedAt?: number;
  completedAt?: number;
  isBye?: boolean;
}

export interface TournamentRound {
  roundIndex: number;
  name: string;
  matches: TournamentMatch[];
}

export interface BracketNode {
  id: string;
  round: number;
  match: TournamentMatch;
  left?: BracketNode;
  right?: BracketNode;
  parent?: BracketNode;
}

export type TournamentStatus = "upcoming" | "active" | "completed";
export type TournamentFormat = "Single Elimination" | "Speedrun Ladder";

export interface TournamentPrize {
  rank: number;
  label: string;
  percentage: number;
  tokens: number;
  participantId?: string;
  participantName?: string;
}

export interface Tournament {
  id: string;
  title: string;
  game: GameId;
  gameTitle: string;
  gameIcon: string;
  size: 8 | 16;
  status: TournamentStatus;
  rounds: TournamentRound[];
  participants: TournamentParticipant[];
  maxParticipants: number;
  prizePool: number;
  entryFee: string;
  date: string;
  format: TournamentFormat;
  bannerGradient?: string;
  winnerId?: string;
  winner?: TournamentParticipant;
  prizes?: TournamentPrize[];
}
