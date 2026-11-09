// src/lib/utils/importValidation.ts
import type { ImportedTeamRow, ColumnMapping, TeamMember } from '@/types/team';

export function validateAndMapRows(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
  existingNames: Set<string> = new Set()
): { results: ImportedTeamRow[]; seenNames: Set<string> } {
  const seenNames = new Set<string>();
  const results: ImportedTeamRow[] = [];

  for (const raw of rows) {
    const errors: string[] = [];
    const teamName = (raw[mapping.teamName] ?? '').trim();
    const participantName = (raw[mapping.participantName] ?? '').trim();
    const teamMember2Name = mapping.teamMember2Name
      ? (raw[mapping.teamMember2Name] ?? '').trim()
      : '';
    const registrationType = mapping.registrationType
      ? (raw[mapping.registrationType] ?? '').trim().toLowerCase()
      : '';

    const nameKey = teamName.toLowerCase();

    if (!teamName) errors.push('Team name is missing');
    if (!participantName) errors.push('Participant name is missing');

    let status: 'valid' | 'invalid' | 'duplicate' = 'valid';

    if (errors.length > 0) {
      status = 'invalid';
    } else if (existingNames.has(nameKey)) {
      status = 'duplicate';
      errors.push(`Team already exists: ${teamName}`);
    } else if (seenNames.has(nameKey)) {
      status = 'duplicate';
      errors.push(`Duplicate team name in file: ${teamName}`);
    }

    if (status === 'valid') seenNames.add(nameKey);

    const members: TeamMember[] = [];
    if (participantName) members.push({ name: participantName });

    const isIndividual = /individual|solo/i.test(registrationType);
    if (!isIndividual && teamMember2Name) {
      members.push({ name: teamMember2Name });
    }

    results.push({ teamName, members, rawRow: raw, errors, status });
  }

  return { results, seenNames };
}

export function summarizeImportResults(results: ImportedTeamRow[]) {
  return {
    totalRows: results.length,
    valid: results.filter(r => r.status === 'valid').length,
    duplicates: results.filter(r => r.status === 'duplicate').length,
    invalid: results.filter(r => r.status === 'invalid').length,
    failed: 0,
  };
}
