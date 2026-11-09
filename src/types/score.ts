// src/types/score.ts
export type EvaluationStatus = 'not_evaluated' | 'partial' | 'evaluated' | 'locked';

export interface CriterionScore {
  criterionId: string;
  value: number | null;
}

export interface Score {
  id: string;
  teamId: string;
  roundId: string;
  criteriaScores: CriterionScore[];
  roundTotal: number | null;
  evaluationStatus: EvaluationStatus;
  updatedBy: string;
  updatedByEmail: string;
  updatedAt: number;
}

export interface ScoreHistory {
  id: string;
  scoreId: string;
  teamId: string;
  roundId: string;
  previousScores: CriterionScore[];
  updatedScores: CriterionScore[];
  previousTotal: number | null;
  newTotal: number | null;
  adminUid: string;
  adminEmail: string;
  timestamp: number;
  reason?: string;
}

