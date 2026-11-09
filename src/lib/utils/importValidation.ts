// src/lib/utils/importValidation.ts
import type { ImportedTeamRow, ColumnMapping, TeamMember } from '@/types/team';

export function validateAndMapRows(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
  existingIds: Set<string>
): { results: ImportedTeamRow[]; seenIds: Set<string> } {
  const seenIds = new Set<string>();
  const results: ImportedTeamRow[] = [];

  for (const raw of rows) {
    const errors: string[] = [];
    const teamId = (raw[mapping.teamId] ?? '').trim();
    const teamName = (raw[mapping.teamName] ?? '').trim();

    if (!teamId) errors.push('Team ID is missing');
    if (!teamName) errors.push('Team name is missing');

    let status: 'valid' | 'invalid' | 'duplicate' = 'valid';

    if (errors.length > 0) {
      status = 'invalid';
    } else if (existingIds.has(teamId) || seenIds.has(teamId)) {
      status = 'duplicate';
      errors.push(`Duplicate team ID: ${teamId}`);
    }

    if (status === 'valid') seenIds.add(teamId);

    // Extract members
    const members: TeamMember[] = [];
    if (mapping.memberFields.length > 0) {
      const member: TeamMember = { name: '' };
      for (const { column, field } of mapping.memberFields) {
        const val = (raw[column] ?? '').trim();
        if (val) (member as Record<string, string>)[field] = val;
      }
      if (member.name) members.push(member);
    } else {
      // Auto-detect member columns
      for (let i = 1; i <= 10; i++) {
        const name = (
          raw[`Member ${i}`] ??
          raw[`member${i}`] ??
          raw[`member_${i}`] ??
          ''
        ).trim();
        if (name) members.push({ name });
        else if (i > 1) break;
      }
    }

    results.push({ teamId, teamName, members, rawRow: raw, errors, status });
  }

  return { results, seenIds };
}

export function summarizeImportResults(results: ImportedTeamRow[]) {
  return {
    totalRows: results.length,
    valid: results.filter(r => r.status === 'valid').length,
    duplicates: results.filter(r => r.status === 'duplicate').length,
    invalid: results.filter(r => r.status === 'invalid').length,
    failed: 0,
    importedIds: results.filter(r => r.status === 'valid').map(r => r.teamId),
  };
}

