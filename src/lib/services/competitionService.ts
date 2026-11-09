// src/lib/services/competitionService.ts
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  db,
} from '@/lib/firebase/firestore';
import { COLLECTIONS } from '@/lib/firebase/firestore';
import type { Competition, Round, Criterion, TieBreakConfig } from '@/types/competition';

export const DEFAULT_COMPETITION_ID = 'main';

export const DEFAULT_CRITERIA: Criterion[] = [
  { id: 'c1', name: 'Innovation', description: 'Originality and creativity of the solution', maxMarks: 10, displayOrder: 1 },
  { id: 'c2', name: 'Technical Excellence', description: 'Quality and robustness of implementation', maxMarks: 10, displayOrder: 2 },
  { id: 'c3', name: 'Presentation', description: 'Clarity and quality of the presentation', maxMarks: 10, displayOrder: 3 },
  { id: 'c4', name: 'Functionality', description: 'Working features and demonstrated capabilities', maxMarks: 10, displayOrder: 4 },
  { id: 'c5', name: 'Impact', description: 'Potential real-world impact and scalability', maxMarks: 10, displayOrder: 5 },
];

export const DEFAULT_ROUNDS: Round[] = [
  { id: 'round1', name: 'Round 1', status: 'not_started', maxMarks: 50 },
  { id: 'round2', name: 'Round 2', status: 'not_started', maxMarks: 50 },
  { id: 'round3', name: 'Round 3', status: 'not_started', maxMarks: 50 },
];

export async function getCompetition(id = DEFAULT_COMPETITION_ID): Promise<Competition | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.COMPETITIONS, id));
  if (!snap.exists()) return null;
  return snap.data() as Competition;
}

export async function initializeCompetition(
  name: string,
  createdBy: string
): Promise<Competition> {
  const competition: Competition = {
    id: DEFAULT_COMPETITION_ID,
    name,
    status: 'upcoming',
    currentRound: null,
    totalRounds: 3,
    maximumFinalScore: 150,
    rounds: DEFAULT_ROUNDS,
    criteria: DEFAULT_CRITERIA,
    tieBreakConfig: { policy: 'shared_position' },
    allowDecimalScores: false,
    revealAnimationDuration: 120,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await setDoc(doc(db, COLLECTIONS.COMPETITIONS, DEFAULT_COMPETITION_ID), competition);
  return competition;
}

export async function updateCompetitionSettings(
  updates: Partial<Competition>
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.COMPETITIONS, DEFAULT_COMPETITION_ID), {
    ...updates,
    updatedAt: Date.now(),
  });
}

export async function updateRoundStatus(
  roundId: string,
  status: Round['status'],
  adminUid: string
): Promise<void> {
  const competition = await getCompetition();
  if (!competition) throw new Error('Competition not found');

  const rounds = competition.rounds.map(r => {
    if (r.id !== roundId) return r;
    return {
      ...r,
      status,
      ...(status === 'in_progress' && !r.startedAt ? { startedAt: Date.now() } : {}),
      ...(status === 'completed' ? { completedAt: Date.now() } : {}),
      ...(status === 'locked' ? { lockedAt: Date.now(), lockedBy: adminUid } : {}),
    };
  });

  await updateDoc(doc(db, COLLECTIONS.COMPETITIONS, DEFAULT_COMPETITION_ID), {
    rounds,
    currentRound: status === 'in_progress' ? roundId : competition.currentRound,
    updatedAt: Date.now(),
  });
}

export async function updateCriteria(criteria: Criterion[]): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.COMPETITIONS, DEFAULT_COMPETITION_ID), {
    criteria,
    updatedAt: Date.now(),
  });
}

export async function updateTieBreakConfig(config: TieBreakConfig): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.COMPETITIONS, DEFAULT_COMPETITION_ID), {
    tieBreakConfig: config,
    updatedAt: Date.now(),
  });
}

export function subscribeToCompetition(
  callback: (comp: Competition | null) => void
): () => void {
  const ref = doc(db, COLLECTIONS.COMPETITIONS, DEFAULT_COMPETITION_ID);
  return onSnapshot(ref, snap => {
    callback(snap.exists() ? (snap.data() as Competition) : null);
  });
}

