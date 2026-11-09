// src/lib/utils/scoring.ts
import type { CriterionScore } from '@/types/score';
import type { Criterion } from '@/types/competition';

export const MAX_CRITERION_MARKS = 10;
export const MAX_ROUND_MARKS = 50;
export const TOTAL_ROUNDS = 3;
export const MAX_FINAL_SCORE = 150;

export function calculateRoundTotal(
  criteriaScores: CriterionScore[],
  requiredCount = 5
): number | null {
  if (criteriaScores.length < requiredCount) return null;
  for (const c of criteriaScores) {
    if (c.value === null || c.value === undefined) return null;
  }
  return criteriaScores.reduce((sum, c) => sum + (c.value ?? 0), 0);
}

export function calculateFinalScore(roundTotals: (number | null)[]): number {
  return roundTotals.reduce<number>((sum, t) => sum + (t ?? 0), 0);
}

export function getEvaluationStatus(
  criteriaScores: CriterionScore[],
  requiredCount = 5
): 'not_evaluated' | 'partial' | 'evaluated' {
  const scored = criteriaScores.filter(c => c.value !== null && c.value !== undefined);
  if (scored.length === 0) return 'not_evaluated';
  if (scored.length < requiredCount) return 'partial';
  return 'evaluated';
}

export function validateCriterionValue(
  value: number,
  max: number = MAX_CRITERION_MARKS,
  allowDecimal = false
): { valid: boolean; error?: string } {
  if (value < 0) return { valid: false, error: 'Value cannot be negative' };
  if (value > max) return { valid: false, error: `Value cannot exceed ${max}` };
  if (!allowDecimal && !Number.isInteger(value)) {
    return { valid: false, error: 'Decimal values are not allowed' };
  }
  return { valid: true };
}

export function validateRoundScores(
  criteriaScores: CriterionScore[],
  criteria: Criterion[],
  allowDecimal = false
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  for (const criterion of criteria) {
    const score = criteriaScores.find(c => c.criterionId === criterion.id);
    if (!score || score.value === null) {
      errors[criterion.id] = 'Score is required';
      continue;
    }
    const result = validateCriterionValue(score.value, criterion.maxMarks, allowDecimal);
    if (!result.valid) errors[criterion.id] = result.error!;
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

