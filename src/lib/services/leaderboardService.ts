// src/lib/services/leaderboardService.ts
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  onSnapshot,
  db,
} from '@/lib/firebase/firestore';
import {
  COLLECTIONS,
  leaderboardSnapshotsCol,
  teamsCol,
  scoresCol,
  stripUndefined,
} from '@/lib/firebase/firestore';
import type { PublicLeaderboard, RevealState, LeaderboardSnapshot } from '@/types/leaderboard';
import type { Score } from '@/types/score';
import type { Team } from '@/types/team';
import type { Competition } from '@/types/competition';
import { rankTeams, calculateMovements, type RankingEntry } from '@/lib/utils/ranking';
import { calculateFinalScore } from '@/lib/utils/scoring';

export const DEFAULT_COMPETITION_ID = 'main';

export function subscribeToPublicLeaderboard(
  competitionId: string,
  callback: (data: PublicLeaderboard | null) => void
): () => void {
  const ref = doc(db, COLLECTIONS.PUBLIC_LEADERBOARDS, competitionId);
  return onSnapshot(ref, snap => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    callback(snap.data() as PublicLeaderboard);
  });
}

export function subscribeToRevealState(
  competitionId: string,
  callback: (data: RevealState | null) => void
): () => void {
  const ref = doc(db, COLLECTIONS.REVEAL, competitionId);
  return onSnapshot(ref, snap => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    callback(snap.data() as RevealState);
  });
}

export async function getPublicLeaderboard(
  competitionId: string
): Promise<PublicLeaderboard | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.PUBLIC_LEADERBOARDS, competitionId));
  if (!snap.exists()) return null;
  return snap.data() as PublicLeaderboard;
}

// Admin: Recalculate the full leaderboard and update the public projection
// This would ideally run via Cloud Functions, but we include a client-side
// fallback for development. In production, trigger a Cloud Function instead.
export async function recalculateLeaderboard(
  competition: Competition
): Promise<void> {
  const [teamsSnap, scoresSnap] = await Promise.all([
    getDocs(teamsCol()),
    getDocs(scoresCol()),
  ]);

  const teams: Team[] = teamsSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Team);
  const scores: Score[] = scoresSnap.docs.map(d => d.data() as Score);

  const teamMap = new Map<string, Team>();
  for (const team of teams) teamMap.set(team.id, team);

  const scoreMap = new Map<string, Score>();
  for (const s of scores) {
    scoreMap.set(`${s.teamId}_${s.roundId}`, s);
  }

  const roundIds = competition.rounds.map(r => r.id);

  const entries: RankingEntry[] = teams.map(team => {
    const roundScores: Record<string, number | null> = {};
    const evaluatedRounds: string[] = [];

    for (const roundId of roundIds) {
      const score = scoreMap.get(`${team.id}_${roundId}`);
      const total = score?.roundTotal ?? null;
      roundScores[roundId] = total;
      if (total !== null) evaluatedRounds.push(roundId);
    }

    const finalScore = calculateFinalScore(Object.values(roundScores));

    return {
      teamId: team.id,
      teamName: team.teamName,
      finalScore,
      roundScores,
      evaluatedRounds,
    };
  });

  const ranked = rankTeams(entries, competition.tieBreakConfig.policy);

  // Build previous rankings for movement calculation
  const prevLeaderboard = await getPublicLeaderboard(competition.id);
  const prevRankings = prevLeaderboard?.rankings.map(r => ({
    teamId: r.teamId,
    rank: r.rank,
  })) ?? [];

  const movements = calculateMovements(
    ranked.map(r => ({ teamId: r.teamId, rank: r.rank })),
    prevRankings
  );

  const revealSnap = await getDoc(doc(db, COLLECTIONS.REVEAL, competition.id));
  const revealState = revealSnap.exists() ? (revealSnap.data() as RevealState) : null;
  const revealStatus = revealState?.status ?? 'concealed';
  const isRevealed = revealStatus === 'revealed';

  const allZero = ranked.every(entry => entry.finalScore === 0);

  const publicRankings = ranked.map((entry, index) => {
    const rank = allZero ? index + 1 : entry.rank;
    const isTopThree = rank <= 3;
    const isConcealed = isTopThree && !isRevealed && entry.finalScore > 0;
    const team = teamMap.get(entry.teamId);

    const members = isConcealed || !team
      ? undefined
      : team.members.map(member => ({ name: member.name }));

    const roundScores = isConcealed
      ? undefined
      : competition.rounds.map(round => {
          const score = scoreMap.get(`${entry.teamId}_${round.id}`);
          return {
            roundId: round.id,
            roundName: round.name,
            criteria: competition.criteria.map(criterion => {
              const criterionScore = score?.criteriaScores.find(
                cs => cs.criterionId === criterion.id
              );
              return {
                name: criterion.name,
                value: criterionScore?.value ?? null,
                max: criterion.maxMarks,
              };
            }),
            total: score?.roundTotal ?? null,
          };
        });

    return {
      rank,
      teamId: entry.teamId,
      teamName: isConcealed ? null : entry.teamName,
      finalScore: isConcealed ? null : entry.finalScore,
      movement: movements.get(entry.teamId) ?? { direction: 'neutral' as const, positions: 0 },
      evaluatedRounds: entry.evaluatedRounds,
      isConcealed,
      members,
      roundScores,
    };
  });

  const isAllRoundsComplete = competition.rounds.every(r => r.status === 'completed' || r.status === 'locked');
  const isProvisional = !isAllRoundsComplete;

  const publicLeaderboard: PublicLeaderboard = {
    competitionId: competition.id,
    competitionName: competition.name,
    status: competition.status,
    currentRound: competition.currentRound,
    totalTeams: teams.length,
    rankings: publicRankings,
    revealStatus,
    updatedAt: Date.now(),
    isProvisional,
  };

  await setDoc(
    doc(db, COLLECTIONS.PUBLIC_LEADERBOARDS, competition.id),
    stripUndefined(publicLeaderboard)
  );
}

export async function createLeaderboardSnapshot(
  competition: Competition,
  type: 'interim' | 'final' | 'reveal',
  createdBy?: string
): Promise<LeaderboardSnapshot> {
  const [teamsSnap, scoresSnap] = await Promise.all([
    getDocs(teamsCol()),
    getDocs(scoresCol()),
  ]);

  const teams: Team[] = teamsSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Team);
  const scores: Score[] = scoresSnap.docs.map(d => d.data() as Score);
  const scoreMap = new Map<string, Score>();
  for (const s of scores) scoreMap.set(`${s.teamId}_${s.roundId}`, s);

  const roundIds = competition.rounds.map(r => r.id);
  const entries: RankingEntry[] = teams.map(team => {
    const roundScores: Record<string, number | null> = {};
    const evaluatedRounds: string[] = [];
    for (const roundId of roundIds) {
      const score = scoreMap.get(`${team.id}_${roundId}`);
      const total = score?.roundTotal ?? null;
      roundScores[roundId] = total;
      if (total !== null) evaluatedRounds.push(roundId);
    }
    return {
      teamId: team.id,
      teamName: team.teamName,
      finalScore: calculateFinalScore(Object.values(roundScores)),
      roundScores,
      evaluatedRounds,
    };
  });

  const ranked = rankTeams(entries, competition.tieBreakConfig.policy);

  const snapshotRef = doc(leaderboardSnapshotsCol());
  const snapshot: LeaderboardSnapshot = {
    id: snapshotRef.id,
    rankings: ranked.map(r => ({
      rank: r.rank,
      teamId: r.teamId,
      teamName: r.teamName,
      finalScore: r.finalScore,
      roundScores: r.roundScores,
    })),
    snapshotType: type,
    createdAt: Date.now(),
    createdBy,
  };

  await setDoc(snapshotRef, stripUndefined(snapshot));
  return snapshot;
}

