// src/types/leaderboard.ts
export type MovementDirection = 'up' | 'down' | 'neutral' | 'new';

export interface RankingMovement {
  direction: MovementDirection;
  positions: number;
}

export interface PublicTeamRow {
  rank: number;
  teamId: string;
  teamName: string | null;
  finalScore: number | null;
  movement: RankingMovement;
  evaluatedRounds: string[];
  isConcealed: boolean;
  members?: Array<{ name: string; [key: string]: string | undefined }>;
  roundScores?: {
    roundId: string;
    roundName: string;
    criteria: Array<{ name: string; value: number | null; max: number }>;
    total: number | null;
  }[];
}

export interface PublicLeaderboard {
  competitionId: string;
  competitionName: string;
  status: string;
  currentRound: string | null;
  totalTeams: number;
  rankings: PublicTeamRow[];
  revealStatus: RevealStatus;
  updatedAt: number;
  isProvisional: boolean;
}

export type RevealStatus = 'concealed' | 'revealing' | 'revealed';

export type RevealStage =
  | 'idle'
  | 'third_name'
  | 'second_name'
  | 'first_name'
  | 'shuffle'
  | 'final_third'
  | 'final_second'
  | 'final_first'
  | 'celebration';

export interface RevealTopThree {
  first: { teamId: string; teamName: string; finalScore: number };
  second: { teamId: string; teamName: string; finalScore: number };
  third: { teamId: string; teamName: string; finalScore: number };
}

export interface RevealAnimationConfig {
  stageDuration: Partial<Record<RevealStage, number>>;
  shuffleDuration: number;
}

export interface RevealState {
  competitionId: string;
  status: RevealStatus;
  stage: RevealStage;
  startedAt: number | null;
  startedBy: string | null;
  snapshotId: string | null;
  topThree: RevealTopThree | null;
  animationConfig: RevealAnimationConfig;
  updatedAt: number;
}

export interface LeaderboardSnapshot {
  id: string;
  rankings: Array<{
    rank: number;
    teamId: string;
    teamName: string;
    finalScore: number;
    roundScores: Record<string, number | null>;
  }>;
  snapshotType: 'interim' | 'final' | 'reveal';
  createdAt: number;
  createdBy?: string;
}

