// src/types/team.ts
export interface TeamMember {
  name: string;
  email?: string;
  registrationNumber?: string;
  department?: string;
  contactInfo?: string;
  [key: string]: string | undefined;
}

export interface Team {
  id: string;
  teamName: string;
  members: TeamMember[];
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

export interface ImportedTeamRow {
  teamName: string;
  members: TeamMember[];
  rawRow: Record<string, string>;
  errors: string[];
  status: 'valid' | 'invalid' | 'duplicate';
}

export interface ImportSummary {
  totalRows: number;
  valid: number;
  duplicates: number;
  invalid: number;
  failed: number;
}

export type ColumnMapping = {
  teamName: string;
  participantName: string;
  registrationType?: string;
  teamMember2Name?: string;
};

