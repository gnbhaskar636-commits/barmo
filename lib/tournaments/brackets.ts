import type { GameId } from "@/lib/games/types";
import type {
  BracketNode,
  TournamentMatch,
  TournamentParticipant,
  TournamentRound,
} from "./types";

export const SEED_PAIRS_8: [number, number][] = [
  [1, 8],
  [4, 5],
  [2, 7],
  [3, 6],
];

export const SEED_PAIRS_16: [number, number][] = [
  [1, 16],
  [8, 9],
  [4, 13],
  [5, 12],
  [2, 15],
  [7, 10],
  [3, 14],
  [6, 11],
];

export function getRoundName(roundIndex: number, totalRounds: number): string {
  const roundsFromFinals = totalRounds - 1 - roundIndex;
  if (roundsFromFinals === 0) return "Grand Finals";
  if (roundsFromFinals === 1) return "Semifinals";
  if (roundsFromFinals === 2) return "Quarterfinals";
  if (roundsFromFinals === 3) return "Round of 16";
  return `Round ${roundIndex + 1}`;
}

export function generateBracket(
  tournamentId: string,
  gameId: GameId,
  size: 8 | 16,
  participants: TournamentParticipant[]
): TournamentRound[] {
  const totalRounds = Math.log2(size);
  const seedPairs = size === 8 ? SEED_PAIRS_8 : SEED_PAIRS_16;
  const participantMap = new Map<number, TournamentParticipant>();
  participants.forEach((p) => {
    participantMap.set(p.seed, p);
  });

  const rounds: TournamentRound[] = [];

  // 1. Generate empty shell for all rounds
  let matchCount = size / 2;
  for (let r = 0; r < totalRounds; r++) {
    const roundMatches: TournamentMatch[] = [];
    for (let m = 0; m < matchCount; m++) {
      const matchId = `${tournamentId}-r${r + 1}-m${m + 1}`;
      const nextRound = r + 1;
      const nextMatchIndex = Math.floor(m / 2);
      const nextSlot = (m % 2 === 0 ? 1 : 2) as 1 | 2;
      const nextMatchId =
        nextRound < totalRounds ? `${tournamentId}-r${nextRound + 1}-m${nextMatchIndex + 1}` : undefined;

      roundMatches.push({
        id: matchId,
        matchId,
        round: r + 1,
        matchIndex: m,
        p1: null,
        p2: null,
        status: "pending",
        gameId,
        nextMatchId,
        nextMatchSlot: nextMatchId ? nextSlot : undefined,
      });
    }

    rounds.push({
      roundIndex: r,
      name: getRoundName(r, totalRounds),
      matches: roundMatches,
    });

    matchCount /= 2;
  }

  // 2. Populate Round 1 with seeded pairings and handle byes
  const r1Matches = rounds[0].matches;
  seedPairs.forEach(([s1, s2], idx) => {
    const match = r1Matches[idx];
    const p1 = participantMap.get(s1) || null;
    const p2 = participantMap.get(s2) || null;

    match.p1 = p1;
    match.p2 = p2;

    if (p1 && p2) {
      match.status = "scheduled";
    } else if (p1 && !p2) {
      // Bye for p1
      match.status = "completed";
      match.winnerId = p1.id;
      match.isBye = true;
      match.score1 = 1;
      match.score2 = 0;
    } else if (!p1 && p2) {
      // Bye for p2
      match.status = "completed";
      match.winnerId = p2.id;
      match.isBye = true;
      match.score1 = 0;
      match.score2 = 1;
    } else {
      match.status = "pending";
    }
  });

  // 3. Propagate byes to Round 2
  r1Matches.forEach((match) => {
    if (match.isBye && match.winnerId && match.nextMatchId && match.nextMatchSlot) {
      const winner = match.p1?.id === match.winnerId ? match.p1 : match.p2;
      if (winner) {
        const nextMatch = findMatch(rounds, match.nextMatchId);
        if (nextMatch) {
          if (match.nextMatchSlot === 1) nextMatch.p1 = winner;
          else nextMatch.p2 = winner;

          if (nextMatch.p1 && nextMatch.p2) {
            nextMatch.status = "scheduled";
          }
        }
      }
    }
  });

  return rounds;
}

export function findMatch(rounds: TournamentRound[], matchId: string): TournamentMatch | null {
  for (const r of rounds) {
    for (const m of r.matches) {
      if (m.id === matchId || m.matchId === matchId) return m;
    }
  }
  return null;
}

export function buildBracketTree(rounds: TournamentRound[]): BracketNode | null {
  if (rounds.length === 0) return null;
  const finalRound = rounds[rounds.length - 1];
  if (!finalRound || finalRound.matches.length === 0) return null;

  const finalMatch = finalRound.matches[0];

  function createNode(match: TournamentMatch): BracketNode {
    const node: BracketNode = {
      id: match.id,
      round: match.round,
      match,
    };

    // Find feeder matches in the previous round
    if (match.round > 1) {
      const prevRound = rounds[match.round - 2];
      if (prevRound) {
        const leftMatch = prevRound.matches.find(
          (m) => m.nextMatchId === match.id && m.nextMatchSlot === 1
        );
        const rightMatch = prevRound.matches.find(
          (m) => m.nextMatchId === match.id && m.nextMatchSlot === 2
        );

        if (leftMatch) {
          node.left = createNode(leftMatch);
          node.left.parent = node;
        }
        if (rightMatch) {
          node.right = createNode(rightMatch);
          node.right.parent = node;
        }
      }
    }

    return node;
  }

  return createNode(finalMatch);
}

export function advanceWinnerInBracket(
  rounds: TournamentRound[],
  matchId: string,
  winnerId: string,
  score1 = 0,
  score2 = 0
): {
  updatedRounds: TournamentRound[];
  nextMatch?: TournamentMatch;
  tournamentWinner?: TournamentParticipant;
} {
  const match = findMatch(rounds, matchId);
  if (!match) {
    throw new Error(`Match with ID "${matchId}" not found in bracket`);
  }

  const winner = match.p1?.id === winnerId ? match.p1 : match.p2?.id === winnerId ? match.p2 : null;
  if (!winner) {
    throw new Error(`Participant "${winnerId}" is not part of match "${matchId}"`);
  }

  const loser = match.p1?.id === winnerId ? match.p2 : match.p1;
  if (loser) {
    loser.eliminated = true;
  }

  match.status = "completed";
  match.winnerId = winnerId;
  match.score1 = score1;
  match.score2 = score2;
  match.completedAt = Date.now();

  let nextMatch: TournamentMatch | undefined;
  let tournamentWinner: TournamentParticipant | undefined;

  if (match.nextMatchId && match.nextMatchSlot) {
    nextMatch = findMatch(rounds, match.nextMatchId) || undefined;
    if (nextMatch) {
      if (match.nextMatchSlot === 1) {
        nextMatch.p1 = winner;
      } else {
        nextMatch.p2 = winner;
      }

      if (nextMatch.p1 && nextMatch.p2) {
        nextMatch.status = "scheduled";
      }
    }
  } else {
    // Grand Finals winner
    tournamentWinner = winner;
  }

  return {
    updatedRounds: rounds,
    nextMatch,
    tournamentWinner,
  };
}
