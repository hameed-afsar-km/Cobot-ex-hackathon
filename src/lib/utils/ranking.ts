// src/lib/utils/ranking.ts
import type { RankingMovement } from '@/types/leaderboard';

export interface RankingEntry {
  teamId: string;
  teamName: string;
  finalScore: number;
  roundScores: Record<string, number | null>;
  evaluatedRounds: string[];
}

export function rankTeams(
  entries: RankingEntry[],
  tieBreakPolicy: 'criteria_priority' | 'round_priority' | 'shared_position' = 'shared_position',
  tieBreakOrder?: string[]
): Array<RankingEntry & { rank: number }> {
  const sorted = [...entries].sort((a, b) => {
    if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
    if (tieBreakPolicy === 'round_priority' && tieBreakOrder) {
      for (const roundId of tieBreakOrder) {
        const aScore = a.roundScores[roundId] ?? 0;
        const bScore = b.roundScores[roundId] ?? 0;
        if (bScore !== aScore) return bScore - aScore;
      }
    }
    return 0;
  });

  let rank = 1;
  return sorted.map((entry, index) => {
    if (index > 0 && sorted[index - 1].finalScore !== entry.finalScore) {
      rank = index + 1;
    }
    return { ...entry, rank: index === 0 ? 1 : rank };
  });
}

export function calculateMovements(
  current: Array<{ teamId: string; rank: number }>,
  previous: Array<{ teamId: string; rank: number }>
): Map<string, RankingMovement> {
  const prevMap = new Map(previous.map(p => [p.teamId, p.rank]));
  const movements = new Map<string, RankingMovement>();

  for (const { teamId, rank } of current) {
    const prevRank = prevMap.get(teamId);
    if (prevRank === undefined) {
      movements.set(teamId, { direction: 'new', positions: 0 });
    } else if (rank < prevRank) {
      movements.set(teamId, { direction: 'up', positions: prevRank - rank });
    } else if (rank > prevRank) {
      movements.set(teamId, { direction: 'down', positions: rank - prevRank });
    } else {
      movements.set(teamId, { direction: 'neutral', positions: 0 });
    }
  }

  return movements;
}

