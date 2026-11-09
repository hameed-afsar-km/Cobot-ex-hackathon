// src/hooks/useCompetition.ts
'use client';

import { useState, useEffect } from 'react';
import { subscribeToCompetition } from '@/lib/services/competitionService';
import type { Competition } from '@/types/competition';

export function useCompetition() {
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToCompetition(
      (comp) => {
        setCompetition(comp);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { competition, loading, error };
}

