// src/hooks/useReveal.ts
'use client';

import { useState, useEffect } from 'react';
import { subscribeToReveal, computeCurrentStage } from '@/lib/services/revealService';
import type { RevealState, RevealStage } from '@/types/leaderboard';

export function useReveal(competitionId: string) {
  const [revealState, setRevealState] = useState<RevealState | null>(null);
  const [currentStage, setCurrentStage] = useState<RevealStage>('idle');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToReveal(competitionId, (state) => {
      setRevealState(state);
      if (state) {
        setCurrentStage(computeCurrentStage(state));
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [competitionId]);

  // For timestamp-based reconstruction, update stage on mount/refresh
  useEffect(() => {
    if (!revealState) return;
    setCurrentStage(computeCurrentStage(revealState));
  }, [revealState]);

  return { revealState, currentStage, loading };
}

