// src/app/admin/rounds/[roundId]/page.tsx
'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useCompetition } from '@/hooks/useCompetition';
import { useAuth } from '@/hooks/useAuth';
import { getAllTeams } from '@/lib/services/teamService';
import { getRoundScores, submitScore } from '@/lib/services/scoreService';
import { recalculateLeaderboard } from '@/lib/services/leaderboardService';
import { logActivity } from '@/lib/services/adminService';
import { LoadingState } from '@/components/shared/LoadingState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import type { Team } from '@/types/team';
import type { Score, CriterionScore } from '@/types/score';
import type { Criterion } from '@/types/competition';
import { toast } from 'sonner';

function ScoreInput({
  value,
  onChange,
  max,
  disabled,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  max: number;
  disabled?: boolean;
}) {
  return (
    <Input
      type="number"
      min={0}
      max={max}
      step={1}
      value={value ?? ''}
      onChange={e => {
        const v = e.target.value === '' ? null : parseFloat(e.target.value);
        onChange(v);
      }}
      disabled={disabled}
      className="w-20 text-center bg-[#0a0a0a] border-[rgba(185,185,185,0.15)] text-[#F5F5F5] focus:border-[rgba(229,9,20,0.5)]"
    />
  );
}

function TeamScoreRow({
  team,
  score,
  criteria,
  onSave,
  locked,
}: {
  team: Team;
  score: Score | undefined;
  criteria: Criterion[];
  onSave: (teamId: string, scores: CriterionScore[]) => Promise<void>;
  locked: boolean;
}) {
  const [localScores, setLocalScores] = useState<Record<string, number | null>>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const initial: Record<string, number | null> = {};
    for (const c of criteria) {
      const found = score?.criteriaScores?.find(cs => cs.criterionId === c.id);
      initial[c.id] = found ? found.value : null;
    }
    setLocalScores(initial);
    setDirty(false);
  }, [score, criteria]);

  const total = criteria.reduce((sum, c) => {
    const v = localScores[c.id];
    return v !== null && v !== undefined ? sum + v : sum;
  }, 0);
  const allFilled = criteria.length > 0 && criteria.every(c => localScores[c.id] !== null && localScores[c.id] !== undefined);

  const handleChange = (criterionId: string, val: number | null) => {
    setLocalScores(s => ({ ...s, [criterionId]: val }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const cs: CriterionScore[] = criteria.map(c => ({
        criterionId: c.id,
        value: localScores[c.id] ?? null,
      }));
      await onSave(team.id, cs);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  const statusIcon = !score || score.evaluationStatus === 'not_evaluated'
    ? <Clock className="w-4 h-4 text-[#858585]" />
    : score.evaluationStatus === 'partial'
    ? <AlertCircle className="w-4 h-4 text-[#D6A84B]" />
    : <CheckCircle className="w-4 h-4 text-[#16A34A]" />;

  return (
    <tr className="border-b border-[rgba(185,185,185,0.06)] hover:bg-[rgba(255,255,255,0.01)]">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {statusIcon}
          <p className="text-sm font-medium text-[#F5F5F5]">{team.teamName}</p>
        </div>
      </td>
      {criteria.map(c => (
        <td key={c.id} className="px-2 py-3 text-center">
          <div className="flex justify-center">
            <ScoreInput
              value={localScores[c.id] ?? null}
              onChange={v => handleChange(c.id, v)}
              max={c.maxMarks}
              disabled={locked}
            />
          </div>
        </td>
      ))}
      <td className="px-4 py-3 text-center">
        <span className={`text-sm font-bold rank-number ${allFilled ? 'text-[#F5F5F5]' : 'text-[#858585]'}`}>
          {allFilled ? total : '—'}/50
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        {!locked && (
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !dirty}
            className={`inline-flex items-center gap-1.5 ${dirty ? 'bg-[#E50914] hover:bg-[#FF3028] text-white' : 'bg-[#1a1a1a] text-[#858585]'}`}
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : dirty ? 'Save' : 'Saved'}
          </Button>
        )}
      </td>
    </tr>
  );
}

function RoundScoringContent() {
  const params = useParams();
  const roundId = (params?.roundId as string) || 'round1';
  const { competition, loading: compLoading } = useCompetition();
  const { adminUser } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);

  const round = competition?.rounds?.find(r => r.id === roundId);
  const isLocked = round?.status === 'locked';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [t, s] = await Promise.all([getAllTeams(), getRoundScores(roundId)]);
      setTeams(t);
      setScores(s);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [roundId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async (teamId: string, criteriaScores: CriterionScore[]) => {
    if (!competition || !adminUser) return;
    const score = await submitScore(
      teamId, roundId, criteriaScores,
      adminUser.uid, adminUser.email,
      competition.criteria.length
    );
    setScores(prev => {
      const idx = prev.findIndex(s => s.teamId === teamId && s.roundId === roundId);
      if (idx >= 0) return prev.map((s, i) => i === idx ? score : s);
      return [...prev, score];
    });
    // Recalculate public leaderboard
    await recalculateLeaderboard(competition);
    await logActivity(adminUser.uid, adminUser.email, 'score_submit', {
      affectedRecord: teamId,
      affectedRecordType: 'score',
      newValue: { roundId, criteriaScores },
    });
    toast.success(`Scores saved for ${teams.find(t => t.id === teamId)?.teamName ?? teamId}`);
  };

  if (compLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingState message="Loading scoring..." />
      </div>
    );
  }

  if (!round || !competition) {
    return <div className="text-[#858585] text-center py-12">Round not found.</div>;
  }

  const evaluatedCount = new Set(scores.filter(s => s.evaluationStatus === 'evaluated').map(s => s.teamId)).size;

  return (
    <div className="max-w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/rounds">
            <Button variant="ghost" size="sm" className="text-[#858585] hover:text-[#F5F5F5]">
              <ArrowLeft className="w-4 h-4 mr-1" /> Rounds
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-[#F5F5F5]">{round.name} – Scoring</h1>
              {isLocked && (
                <span className="text-xs px-2 py-0.5 rounded border text-[#D6A84B] border-[rgba(214,168,75,0.3)] bg-[rgba(214,168,75,0.08)]">
                  Locked
                </span>
              )}
            </div>
            <p className="text-xs text-[#858585] mt-0.5">
              {evaluatedCount}/{teams.length} teams evaluated · Max 50 marks per team
            </p>
          </div>
        </div>
      </div>

      {/* Score table */}
      <div className="card-dark rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-[rgba(185,185,185,0.08)] bg-[rgba(255,255,255,0.02)]">
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#858585] uppercase tracking-wider">Team</th>
              {competition.criteria.map(c => (
                <th key={c.id} className="px-2 py-3 text-center text-xs font-semibold text-[#858585] uppercase tracking-wider min-w-[90px]">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="truncate max-w-[80px]">{c.name}</span>
                    <span className="text-[#E50914]">/{c.maxMarks}</span>
                  </div>
                </th>
              ))}
              <th className="px-4 py-3 text-center text-xs font-semibold text-[#858585] uppercase tracking-wider">Total</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {teams.map(team => (
              <TeamScoreRow
                key={team.id}
                team={team}
                score={scores.find(s => s.teamId === team.id)}
                criteria={competition.criteria}
                onSave={handleSave}
                locked={isLocked}
              />
            ))}
          </tbody>
        </table>
        {teams.length === 0 && (
          <div className="py-12 text-center text-[#858585]">
            No teams registered. <Link href="/admin/teams" className="text-[#E50914] hover:underline">Add teams first</Link>.
          </div>
        )}
      </div>
    </div>
  );
}

export default function RoundScoringPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <LoadingState message="Loading scoring..." />
      </div>
    }>
      <RoundScoringContent />
    </Suspense>
  );
}
