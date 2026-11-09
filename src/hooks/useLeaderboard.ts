// src/hooks/useLeaderboard.ts
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  subscribeToPublicLeaderboard,
  getPublicLeaderboard,
} from '@/lib/services/leaderboardService';
import { subscribeToTeams } from '@/lib/services/teamService';
import type { PublicLeaderboard, PublicTeamRow } from '@/types/leaderboard';
import type { Team } from '@/types/team';

function mergeTeams(
  leaderboard: PublicLeaderboard | null,
  teams: Team[]
): PublicLeaderboard | null {
  if (!leaderboard) {
    if (teams.length === 0) return null;
    return {
      competitionId: 'main',
      competitionName: 'Competition Leaderboard',
      status: 'upcoming',
      currentRound: null,
      totalTeams: teams.length,
      maximumFinalScore: 0,
      rankings: teams.map((team, index) => ({
        rank: index + 1,
        teamId: team.id,
        teamName: team.teamName,
        finalScore: 0,
        movement: { direction: 'neutral', positions: 0 },
        evaluatedRounds: [],
        isConcealed: false,
      })),
      revealStatus: 'concealed',
      updatedAt: Date.now(),
      isProvisional: true,
    };
  }

  if (teams.length === 0) return leaderboard;

  const teamIds = new Set(teams.map(team => team.id));
  const teamNames = new Map(teams.map(team => [team.id, team.teamName]));
  const current = leaderboard.rankings
    .filter(row => teamIds.has(row.teamId))
    .map(row => {
      const teamName = teamNames.get(row.teamId);
      if (!teamName || row.isConcealed || teamName === row.teamName) return row;
      return { ...row, teamName };
    });
  const known = new Set(current.map(row => row.teamId));
  const missing = teams.filter(team => !known.has(team.id));
  const namesChanged = current.some((row, i) => row !== leaderboard.rankings[i]);
  if (
    missing.length === 0 &&
    current.length === leaderboard.rankings.length &&
    !namesChanged
  ) {
    return leaderboard;
  }

  const maxRank = current.reduce((max, row) => Math.max(max, row.rank), 0);
  const extra: PublicTeamRow[] = missing.map((team, index) => ({
    rank: maxRank + index + 1,
    teamId: team.id,
    teamName: team.teamName,
    finalScore: 0,
    movement: { direction: 'new', positions: 0 },
    evaluatedRounds: [],
    isConcealed: false,
  }));

  return {
    ...leaderboard,
    totalTeams: teams.length,
    rankings: [...current, ...extra],
  };
}

export function useLeaderboard(competitionId: string) {
  const [leaderboard, setLeaderboard] = useState<PublicLeaderboard | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const apply = (data: PublicLeaderboard | null) => {
      if (cancelled) return;
      setLeaderboard(prev => {
        if (prev === data) return prev;
        if (prev && data && prev.updatedAt === data.updatedAt) return prev;
        return data;
      });
      setLoading(false);
    };

    const unsubscribe = subscribeToPublicLeaderboard(competitionId, apply);

    const refresh = async () => {
      try {
        apply(await getPublicLeaderboard(competitionId));
      } catch (err) {
        if (cancelled) return;
        setError(err as Error);
        setLoading(false);
      }
    };

    refresh();
    const interval = setInterval(refresh, 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      unsubscribe();
    };
  }, [competitionId]);

  useEffect(() => {
    return subscribeToTeams(setTeams);
  }, []);

  const merged = useMemo(() => mergeTeams(leaderboard, teams), [leaderboard, teams]);

  return { leaderboard: merged, loading, error };
}
