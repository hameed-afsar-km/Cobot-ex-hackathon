// src/types/competition.ts
export type CompetitionStatus = 'upcoming' | 'in_progress' | 'completed' | 'revealed';
export type RoundStatus = 'not_started' | 'in_progress' | 'completed' | 'locked';

export interface Criterion {
  id: string;
  name: string;
  description?: string;
  maxMarks: number;
  displayOrder: number;
}

export interface Round {
  id: string;
  name: string;
  status: RoundStatus;
  maxMarks: number;
  allowNegativeMarks?: boolean;
  criteria?: Criterion[];
  startedAt?: number;
  completedAt?: number;
  lockedAt?: number;
  lockedBy?: string;
}

export type TieBreakPolicy = 'criteria_priority' | 'round_priority' | 'shared_position';

export interface TieBreakConfig {
  policy: TieBreakPolicy;
  criteriaPriority?: string[];
  roundPriority?: string[];
}

export interface Competition {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  status: CompetitionStatus;
  currentRound: string | null;
  totalRounds: number;
  maximumFinalScore: number;
  rounds: Round[];
  criteria: Criterion[];
  markingSchemeVersion?: number;
  tieBreakConfig: TieBreakConfig;
  allowDecimalScores: boolean;
  revealAnimationDuration?: number;
  createdAt: number;
  updatedAt: number;
}

