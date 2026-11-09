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

  // Advance the stage locally while the reveal is playing so viewers do not
  // depend on Firestore updates (the admin only triggers the reveal once).
  useEffect(() => {
    if (!revealState) return;

    const update = () => setCurrentStage(computeCurrentStage(revealState));
    update();

    if (revealState.status !== 'revealing') return;

    const interval = window.setInterval(update, 200);
    return () => window.clearInterval(interval);
  }, [revealState]);

  return { revealState, currentStage, loading };
}

