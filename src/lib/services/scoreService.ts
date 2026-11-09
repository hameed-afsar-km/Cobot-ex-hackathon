// src/lib/services/scoreService.ts
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  db,
} from '@/lib/firebase/firestore';
import { COLLECTIONS, scoresCol, scoreHistoryCol } from '@/lib/firebase/firestore';
import type { Score, ScoreHistory, CriterionScore, EvaluationStatus } from '@/types/score';
import {
  calculateRoundTotal,
  getEvaluationStatus,
} from '@/lib/utils/scoring';

function scoreId(teamId: string, roundId: string): string {
  return `${teamId}_${roundId}`;
}

export async function getScore(teamId: string, roundId: string): Promise<Score | null> {
  const id = scoreId(teamId, roundId);
  const snap = await getDoc(doc(db, COLLECTIONS.SCORES, id));
  if (!snap.exists()) return null;
  return snap.data() as Score;
}

export async function getRoundScores(roundId: string): Promise<Score[]> {
  const snap = await getDocs(query(scoresCol(), where('roundId', '==', roundId)));
  return snap.docs.map(d => d.data() as Score);
}

export async function getTeamScores(teamId: string): Promise<Score[]> {
  const snap = await getDocs(query(scoresCol(), where('teamId', '==', teamId)));
  return snap.docs.map(d => d.data() as Score);
}

export async function getAllScores(): Promise<Score[]> {
  const snap = await getDocs(scoresCol());
  return snap.docs.map(d => d.data() as Score);
}

export async function submitScore(
  teamId: string,
  roundId: string,
  criteriaScores: CriterionScore[],
  adminUid: string,
  adminEmail: string,
  criteriaCount = 5
): Promise<Score> {
  const id = scoreId(teamId, roundId);
  
  // Check for existing score to build history
  const existing = await getScore(teamId, roundId);
  
  const roundTotal = calculateRoundTotal(criteriaScores, criteriaCount);
  const evaluationStatus = getEvaluationStatus(criteriaScores, criteriaCount) as EvaluationStatus;

  const score: Score = {
    id,
    teamId,
    roundId,
    criteriaScores,
    roundTotal,
    evaluationStatus,
    updatedBy: adminUid,
    updatedByEmail: adminEmail,
    updatedAt: Date.now(),
  };

  await setDoc(doc(db, COLLECTIONS.SCORES, id), score);

  // Record history if updating
  if (existing) {
    const histRef = doc(scoreHistoryCol());
    const history: ScoreHistory = {
      id: histRef.id,
      scoreId: id,
      teamId,
      roundId,
      previousScores: existing.criteriaScores,
      updatedScores: criteriaScores,
      previousTotal: existing.roundTotal,
      newTotal: roundTotal,
      adminUid,
      adminEmail,
      timestamp: Date.now(),
    };
    await setDoc(histRef, history);
  }

  return score;
}

export async function getScoreHistory(teamId: string, roundId?: string): Promise<ScoreHistory[]> {
  let q;
  if (roundId) {
    q = query(
      scoreHistoryCol(),
      where('teamId', '==', teamId),
      where('roundId', '==', roundId),
      orderBy('timestamp', 'desc')
    );
  } else {
    q = query(
      scoreHistoryCol(),
      where('teamId', '==', teamId),
      orderBy('timestamp', 'desc')
    );
  }
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as ScoreHistory);
}

