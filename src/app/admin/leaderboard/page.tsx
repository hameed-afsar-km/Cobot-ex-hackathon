// src/app/admin/leaderboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { LoadingState } from '@/components/shared/LoadingState';
import { useCompetition } from '@/hooks/useCompetition';
import { getAllTeams } from '@/lib/services/teamService';
import { getAllScores } from '@/lib/services/scoreService';
import { recalculateLeaderboard } from '@/lib/services/leaderboardService';
import { rankTeams } from '@/lib/utils/ranking';
import {
  calculateFinalScore,
  getCompetitionMaxScore,
  getRoundMaxMarks,
} from '@/lib/utils/scoring';
import type { Team } from '@/types/team';
import type { Score } from '@/types/score';
import { Button } from '@/components/ui/button';
import { RefreshCw, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function AdminLeaderboardPage() {
  const { competition, loading: compLoading } = useCompetition();
  const [teams, setTeams] = useState<Team[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    Promise.all([getAllTeams(), getAllScores()])
      .then(([t, s]) => { setTeams(t); setScores(s); })
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const handleRecalculate = async () => {
    if (!competition) return;
    setRecalculating(true);
    try {
      await recalculateLeaderboard(competition);
      toast.success('Leaderboard recalculated and synchronized with public view');
    } catch (err: any) {
      toast.error('Recalculation failed', { description: err?.message });
    } finally {
      setRecalculating(false);
    }
  };

  if (compLoading || loading) return <LoadingState message="Loading leaderboard..." />;
  if (!competition) return <div className="text-[#858585] text-center py-12">Competition not found.</div>;

  const roundIds = competition.rounds.map(r => r.id);
  const scoreMap = new Map(scores.map(s => [`${s.teamId}_${s.roundId}`, s]));
  const entries = teams.map(team => {
    const roundScores: Record<string, number | null> = {};
    for (const rid of roundIds) {
      const sc = scoreMap.get(`${team.id}_${rid}`);
      roundScores[rid] = sc?.roundTotal ?? null;
    }
    return {
      teamId: team.id,
      teamName: team.teamName,
      finalScore: calculateFinalScore(Object.values(roundScores)),
      roundScores,
      evaluatedRounds: Object.entries(roundScores).filter(([, v]) => v !== null).map(([k]) => k),
    };
  });
  const ranked = rankTeams(entries, competition.tieBreakConfig?.policy || 'shared_position');
  const maxFinalScore = getCompetitionMaxScore(competition);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F5F5F5]">Leaderboard (Admin Preview)</h1>
          <p className="text-[#858585] text-sm mt-1">
            Authoritative rankings computed across all {competition.rounds.length} rounds (out of {maxFinalScore})
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/" target="_blank">
            <Button variant="outline" className="border-[rgba(185,185,185,0.2)] text-[#858585] hover:text-[#F5F5F5] flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              Public View
            </Button>
          </Link>
          <Button
            onClick={handleRecalculate}
            disabled={recalculating}
            className="bg-[#E50914] hover:bg-[#FF3028] text-white flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} />
            {recalculating ? 'Updating...' : 'Sync Public Leaderboard'}
          </Button>
        </div>
      </div>

      <div className="card-dark rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[rgba(185,185,185,0.08)] bg-[rgba(255,255,255,0.02)]">
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#858585] uppercase tracking-wider">Rank</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#858585] uppercase tracking-wider">Team</th>
              {competition.rounds.map(r => (
                <th key={r.id} className="px-3 py-3 text-center text-xs font-semibold text-[#858585] uppercase tracking-wider">
                  {r.name}
                </th>
              ))}
              <th className="px-4 py-3 text-right text-xs font-semibold text-[#858585] uppercase tracking-wider">Total</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map(entry => (
              <tr key={entry.teamId} className="border-b border-[rgba(185,185,185,0.06)] hover:bg-[rgba(255,255,255,0.02)]">
                <td className="px-4 py-3">
                  <span className={`text-xl font-bold rank-number ${
                    entry.rank === 1 ? 'rank-gold' : entry.rank === 2 ? 'rank-silver' : entry.rank === 3 ? 'rank-bronze' : 'text-[#858585]'
                  }`}>
                    {String(entry.rank).padStart(2, '0')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-[#F5F5F5]">{entry.teamName}</p>
                </td>
                {competition.rounds.map(r => (
                  <td key={r.id} className="px-3 py-3 text-center">
                    <span className={`text-sm font-medium ${entry.roundScores[r.id] !== null ? 'text-[#F5F5F5]' : 'text-[#555]'}`}>
                      {entry.roundScores[r.id] ?? '—'}
                    </span>
                    <span className="text-xs text-[#444]">/{getRoundMaxMarks(r, competition.criteria)}</span>
                  </td>
                ))}
                <td className="px-4 py-3 text-right">
                  <span className="text-lg font-bold text-[#F5F5F5] rank-number">{entry.finalScore}</span>
                  <span className="text-xs text-[#858585]">/{maxFinalScore}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {ranked.length === 0 && (
          <div className="py-12 text-center text-[#858585]">No teams or scores yet.</div>
        )}
      </div>
    </div>
  );
}

