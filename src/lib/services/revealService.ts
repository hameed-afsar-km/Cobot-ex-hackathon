// src/lib/services/revealService.ts
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  db,
} from '@/lib/firebase/firestore';
import { COLLECTIONS } from '@/lib/firebase/firestore';
import type { RevealState, RevealStage, RevealTopThree, RevealAnimationConfig } from '@/types/leaderboard';
import type { Competition } from '@/types/competition';
import { createLeaderboardSnapshot, recalculateLeaderboard } from './leaderboardService';
import { getCompetition } from './competitionService';

export const DEFAULT_ANIMATION_CONFIG: RevealAnimationConfig = {
  stageDuration: {
    idle: 0,
    third_name: 3500,
    second_name: 3500,
    first_name: 4000,
    shuffle: 6000,
    reblur: 2200,
    final_third: 4500,
    final_second: 4500,
    final_first: 5500,
    celebration: 15000,
  },
  shuffleDuration: 6000,
};

export async function getRevealState(competitionId: string): Promise<RevealState | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.REVEAL, competitionId));
  if (!snap.exists()) return null;
  return snap.data() as RevealState;
}

export function subscribeToReveal(
  competitionId: string,
  callback: (state: RevealState | null) => void
): () => void {
  const ref = doc(db, COLLECTIONS.REVEAL, competitionId);
  return onSnapshot(ref, snap => {
    callback(snap.exists() ? (snap.data() as RevealState) : null);
  });
}

/**
 * Compute the current reveal stage based on startedAt timestamp.
 * This ensures late joiners reconstruct the correct stage.
 */
export function computeCurrentStage(
  state: RevealState
): RevealStage {
  if (state.status !== 'revealing' || !state.startedAt) return state.stage;

  const elapsed = Date.now() - state.startedAt;
  const stageDuration = state.animationConfig?.stageDuration ?? {};

  const stages: RevealStage[] = [
    'third_name',
    'second_name',
    'first_name',
    'shuffle',
    'reblur',
    'final_third',
    'final_second',
    'final_first',
    'celebration',
  ];

  let cumulative = 0;
  for (const stage of stages) {
    cumulative +=
      stageDuration[stage] ?? DEFAULT_ANIMATION_CONFIG.stageDuration[stage] ?? 4000;
    if (elapsed < cumulative) return stage;
  }

  return 'celebration';
}

export async function initiateReveal(
  competition: Competition,
  topThree: RevealTopThree,
  adminUid: string
): Promise<RevealState> {
  // Create final snapshot
  const snapshot = await createLeaderboardSnapshot(competition, 'reveal', adminUid);

  const revealState: RevealState = {
    competitionId: competition.id,
    status: 'revealing',
    stage: 'third_name',
    startedAt: Date.now(),
    startedBy: adminUid,
    snapshotId: snapshot.id,
    topThree,
    animationConfig: DEFAULT_ANIMATION_CONFIG,
    updatedAt: Date.now(),
  };

  await setDoc(doc(db, COLLECTIONS.REVEAL, competition.id), revealState);

  // Keep the public projection concealed while the reveal is playing.
  await recalculateLeaderboard(competition);

  return revealState;
}

export async function completeReveal(competitionId: string): Promise<void> {
  await setDoc(
    doc(db, COLLECTIONS.REVEAL, competitionId),
    {
      competitionId,
      status: 'revealed',
      stage: 'celebration',
      updatedAt: Date.now(),
    },
    { merge: true }
  );

  // Unblur the top three in the public projection only after the reveal ends.
  const competition = await getCompetition(competitionId);
  if (competition) {
    await recalculateLeaderboard(competition);
  }
}

export async function resetReveal(competitionId: string): Promise<void> {
  const revealState: Partial<RevealState> = {
    competitionId,
    status: 'concealed',
    stage: 'idle',
    startedAt: null,
    startedBy: null,
    snapshotId: null,
    topThree: null,
    animationConfig: DEFAULT_ANIMATION_CONFIG,
    updatedAt: Date.now(),
  };
  await setDoc(doc(db, COLLECTIONS.REVEAL, competitionId), revealState, { merge: true });

  // Re-hide the top three in the public projection.
  const competition = await getCompetition(competitionId);
  if (competition) {
    await recalculateLeaderboard(competition);
  }
}

export async function initRevealDocument(competitionId: string): Promise<void> {
  const existing = await getRevealState(competitionId);
  if (existing) return;

  const initial: RevealState = {
    competitionId,
    status: 'concealed',
    stage: 'idle',
    startedAt: null,
    startedBy: null,
    snapshotId: null,
    topThree: null,
    animationConfig: DEFAULT_ANIMATION_CONFIG,
    updatedAt: Date.now(),
  };
  await setDoc(doc(db, COLLECTIONS.REVEAL, competitionId), initial);
}

