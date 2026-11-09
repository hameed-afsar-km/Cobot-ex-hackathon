// src/lib/services/revealService.ts
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  db,
} from '@/lib/firebase/firestore';
import { COLLECTIONS } from '@/lib/firebase/firestore';
import type { RevealState, RevealStage, RevealTopThree, RevealAnimationConfig } from '@/types/leaderboard';
import type { Competition } from '@/types/competition';
import { createLeaderboardSnapshot } from './leaderboardService';

export const DEFAULT_ANIMATION_CONFIG: RevealAnimationConfig = {
  stageDuration: {
    idle: 0,
    third_name: 4000,
    second_name: 4000,
    first_name: 4000,
    shuffle: 8000,
    final_third: 5000,
    final_second: 5000,
    final_first: 6000,
    celebration: 15000,
  },
  shuffleDuration: 8000,
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
  const config = state.animationConfig;

  const stages: RevealStage[] = [
    'third_name',
    'second_name',
    'first_name',
    'shuffle',
    'final_third',
    'final_second',
    'final_first',
    'celebration',
  ];

  let cumulative = 0;
  for (const stage of stages) {
    cumulative += config.stageDuration[stage] ?? 4000;
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
  return revealState;
}

export async function completeReveal(competitionId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.REVEAL, competitionId), {
    status: 'revealed',
    stage: 'celebration',
    updatedAt: Date.now(),
  });
}

export async function resetReveal(competitionId: string): Promise<void> {
  const revealState: Partial<RevealState> = {
    status: 'concealed',
    stage: 'idle',
    startedAt: null,
    startedBy: null,
    snapshotId: null,
    topThree: null,
    updatedAt: Date.now(),
  };
  await updateDoc(doc(db, COLLECTIONS.REVEAL, competitionId), revealState);
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

