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
import { auth } from '@/lib/firebase/config';
import type { Competition, Round, Criterion, TieBreakConfig } from '@/types/competition';

export const DEFAULT_COMPETITION_ID = 'main';
export const MARKING_SCHEME_VERSION = 2;

export const ROUND_CRITERIA: Record<string, Criterion[]> = {
  round1: [
    { id: 'problem_understanding', name: 'Problem Understanding', description: 'Clarity and depth of understanding of the challenge', maxMarks: 5, displayOrder: 1 },
    { id: 'core_functionality', name: 'Core Functionality', description: 'Working core features and demonstrated capabilities', maxMarks: 15, displayOrder: 2 },
    { id: 'ui_ux', name: 'UI/UX Design', description: 'Usability, visual design, and overall experience', maxMarks: 10, displayOrder: 3 },
    { id: 'innovation', name: 'Innovation', description: 'Originality and creativity of the solution', maxMarks: 5, displayOrder: 4 },
  ],
  round2: [
    { id: 'problem_understanding', name: 'Problem Understanding', description: 'Clarity and depth of understanding of the challenge', maxMarks: 5, displayOrder: 1 },
    { id: 'core_functionality', name: 'Core Functionality', description: 'Working core features and demonstrated capabilities', maxMarks: 20, displayOrder: 2 },
    { id: 'ui_ux', name: 'UI/UX Design', description: 'Usability, visual design, and overall experience', maxMarks: 10, displayOrder: 3 },
    { id: 'innovation', name: 'Innovation', description: 'Originality and creativity of the solution', maxMarks: 5, displayOrder: 4 },
  ],
  round3: [
    { id: 'correct_implementation', name: 'Correct Implementation', description: 'The side quest is implemented correctly and completely', maxMarks: 10, displayOrder: 1 },
    { id: 'integration', name: 'Integration', description: 'Seamless integration with the existing solution', maxMarks: 5, displayOrder: 2 },
    { id: 'technical_quality', name: 'Technical Quality', description: 'Code quality, structure, and maintainability', maxMarks: 2, displayOrder: 3 },
    { id: 'ui_ux', name: 'UI/UX', description: 'Usability and visual polish of the side quest', maxMarks: 5, displayOrder: 4 },
    { id: 'creativity', name: 'Creativity', description: 'Original and inventive approach to the side quest', maxMarks: 3, displayOrder: 5 },
  ],
};

export const DEFAULT_CRITERIA: Criterion[] = ROUND_CRITERIA.round1;

export const DEFAULT_ROUNDS: Round[] = [
  { id: 'round1', name: 'Round 1', status: 'not_started', maxMarks: 35, criteria: ROUND_CRITERIA.round1 },
  { id: 'round2', name: 'Round 2', status: 'not_started', maxMarks: 50, criteria: ROUND_CRITERIA.round2 },
  { id: 'round3', name: 'Round 3 (Side Quest)', status: 'not_started', maxMarks: 25, allowNegativeMarks: true, criteria: ROUND_CRITERIA.round3 },
];

/**
 * Competitions created before per-round marking stored a single global criteria
 * list and fixed 50-mark rounds. Upgrade them to the official per-round scheme.
 */
export function migrateCompetition(raw: Competition): { competition: Competition; changed: boolean } {
  let competition = raw;
  let changed = false;

  if (raw.markingSchemeVersion !== MARKING_SCHEME_VERSION) {
    const rounds = raw.rounds.map(round => {
      const defaultCriteria = ROUND_CRITERIA[round.id];
      if (!defaultCriteria) return round;

      return {
        ...round,
        criteria: defaultCriteria,
        maxMarks: defaultCriteria.reduce((sum, criterion) => sum + criterion.maxMarks, 0),
      };
    });

    const maximumFinalScore = rounds.reduce(
      (sum, round) => sum + (round.criteria?.reduce((s, c) => s + c.maxMarks, 0) ?? round.maxMarks),
      0
    );

    competition = {
      ...raw,
      rounds,
      criteria: rounds[0]?.criteria ?? raw.criteria,
      maximumFinalScore,
      totalRounds: rounds.length,
      markingSchemeVersion: MARKING_SCHEME_VERSION,
      updatedAt: Date.now(),
    };
    changed = true;
  }

  const needsNegativeMarksOption = competition.rounds.some(
    round => round.id === 'round3' && round.allowNegativeMarks === undefined
  );
  if (needsNegativeMarksOption) {
    competition = {
      ...competition,
      rounds: competition.rounds.map(round =>
        round.id === 'round3' && round.allowNegativeMarks === undefined
          ? { ...round, allowNegativeMarks: true }
          : round
      ),
      updatedAt: Date.now(),
    };
    changed = true;
  }

  return { competition, changed };
}

export async function getCompetition(id = DEFAULT_COMPETITION_ID): Promise<Competition | null> {
  const ref = doc(db, COLLECTIONS.COMPETITIONS, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  const { competition, changed } = migrateCompetition(snap.data() as Competition);
  if (changed && auth.currentUser) {
    try {
      await setDoc(ref, competition);
    } catch (error) {
      console.error('Failed to migrate competition marking scheme', error);
    }
  }
  return competition;
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
    totalRounds: DEFAULT_ROUNDS.length,
    maximumFinalScore: DEFAULT_ROUNDS.reduce((sum, round) => sum + round.maxMarks, 0),
    rounds: DEFAULT_ROUNDS,
    criteria: DEFAULT_CRITERIA,
    markingSchemeVersion: MARKING_SCHEME_VERSION,
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

export async function updateRounds(rounds: Round[]): Promise<void> {
  const maximumFinalScore = rounds.reduce((sum, round) => sum + round.maxMarks, 0);
  await updateDoc(doc(db, COLLECTIONS.COMPETITIONS, DEFAULT_COMPETITION_ID), {
    rounds,
    maximumFinalScore,
    criteria: rounds[0]?.criteria ?? [],
    markingSchemeVersion: MARKING_SCHEME_VERSION,
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
  callback: (comp: Competition | null) => void,
  onError?: (error: Error) => void
): () => void {
  const ref = doc(db, COLLECTIONS.COMPETITIONS, DEFAULT_COMPETITION_ID);
  return onSnapshot(
    ref,
    snap => {
      if (!snap.exists()) {
        callback(null);
        return;
      }

      const { competition, changed } = migrateCompetition(snap.data() as Competition);
      if (changed && auth.currentUser) {
        // Persist so every client (and future reloads) uses the new scheme.
        setDoc(ref, competition).catch(error => {
          console.error('Failed to migrate competition marking scheme', error);
        });
      }
      callback(competition);
    },
    error => onError?.(error)
  );
}

