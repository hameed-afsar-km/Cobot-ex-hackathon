// src/hooks/useLeaderboard.ts
'use client';

import { useState, useEffect } from 'react';
import { subscribeToPublicLeaderboard } from '@/lib/services/leaderboardService';
import type { PublicLeaderboard } from '@/types/leaderboard';

export function useLeaderboard(competitionId: string) {
  const [leaderboard, setLeaderboard] = useState<PublicLeaderboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToPublicLeaderboard(competitionId, (data) => {
      setLeaderboard(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [competitionId]);

  return { leaderboard, loading, error };
}

