// src/app/team/[teamId]/page.tsx
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, Trophy, Shield, Lock, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/shared/LoadingState';
import { getTeam } from '@/lib/services/teamService';
import { getTeamScores } from '@/lib/services/scoreService';
import { useCompetition } from '@/hooks/useCompetition';
import { useReveal } from '@/hooks/useReveal';
import { DEFAULT_COMPETITION_ID } from '@/lib/services/leaderboardService';
import {
  getCompetitionMaxScore,
  getRoundCriteria,
  getRoundMaxMarks,
} from '@/lib/utils/scoring';
import type { Team } from '@/types/team';
import type { Score } from '@/types/score';

function TeamDetailsContent() {
  const params = useParams();
  const teamId = params?.teamId as string;

  const { competition, loading: compLoading } = useCompetition();
  const { revealState, loading: revealLoading } = useReveal(DEFAULT_COMPETITION_ID);

  const [team, setTeam] = useState<Team | null>(null);
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) return;
    Promise.all([getTeam(teamId), getTeamScores(teamId)])
      .then(([t, s]) => {
        setTeam(t);
        setScores(s);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [teamId]);

  if (loading || compLoading || revealLoading) {
    return (
      <div className="min-h-screen bg-[#090909] flex items-center justify-center">
        <LoadingState message="Loading team profile..." />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-[#090909] flex flex-col items-center justify-center p-4">
        <h1 className="text-xl font-bold text-[#F5F5F5] mb-2">Team Not Found</h1>
        <p className="text-[#858585] text-sm mb-4">This team could not be found.</p>
        <Link href="/">
          <Button variant="outline" className="border-[rgba(229,9,20,0.3)] text-[#E50914]">
            Back to Leaderboard
          </Button>
        </Link>
      </div>
    );
  }

  // Calculate scores
  const scoreMap = new Map(scores.map(s => [s.roundId, s]));
  const roundTotals = (competition?.rounds || []).map(r => scoreMap.get(r.id)?.roundTotal ?? null);
  const totalScore = roundTotals.reduce<number>((sum, val) => sum + (val ?? 0), 0);
  const maxFinalScore = competition ? getCompetitionMaxScore(competition) : 0;

  return (
    <main className="min-h-screen bg-[#090909] py-12 px-4">
      <div className="container mx-auto max-w-4xl space-y-8">
        <Link href="/">
          <Button variant="ghost" size="sm" className="text-[#858585] hover:text-[#F5F5F5] -ml-2 mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Leaderboard
          </Button>
        </Link>

        {/* Hero Card */}
        <div className="card-crimson p-6 md:p-8 rounded-2xl glow-red-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Trophy className="w-48 h-48 text-[#E50914]" />
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs text-[#858585]">
                  Registered {new Date(team.createdAt).toLocaleDateString()}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-[#F5F5F5] tracking-tight">
                {team.teamName}
              </h1>
            </div>

            <div className="text-left md:text-right bg-[#090909]/60 p-4 rounded-xl border border-[rgba(229,9,20,0.2)]">
              <span className="text-xs text-[#858585] uppercase tracking-wider block">Total Cumulative Score</span>
              <span className="text-3xl md:text-4xl font-black text-[#F5F5F5] rank-number">
                {totalScore}
                <span className="text-sm font-normal text-[#858585]">/{maxFinalScore}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Members */}
        <div className="card-dark p-6 rounded-xl space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#E50914]" />
            <h2 className="font-semibold text-lg text-[#F5F5F5]">Team Members</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {team.members.map((m, i) => (
              <div key={i} className="p-3.5 rounded-lg bg-[#0d0d0d] border border-[rgba(185,185,185,0.08)] flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#190707] border border-[rgba(229,9,20,0.3)] flex items-center justify-center text-xs font-bold text-[#E50914]">
                  {m.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-[#F5F5F5]">{m.name}</p>
                  {m.department && <p className="text-xs text-[#858585]">{m.department}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Round Evaluations */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-[#E50914]" />
            <h2 className="font-semibold text-lg text-[#F5F5F5]">Round Evaluations & Criteria Breakdown</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(competition?.rounds || []).map((round) => {
              const roundScore = scoreMap.get(round.id);
              const criteria = competition ? getRoundCriteria(competition, round.id) : [];
              const roundMax = competition ? getRoundMaxMarks(round, competition.criteria) : 0;

              return (
                <div key={round.id} className="card-dark rounded-xl p-5 border border-[rgba(185,185,185,0.08)] space-y-4">
                  <div className="flex items-center justify-between border-b border-[rgba(185,185,185,0.08)] pb-3">
                    <div>
                      <h3 className="font-bold text-[#F5F5F5]">{round.name}</h3>
                      <span className="text-xs text-[#858585] capitalize">
                        {round.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-bold text-[#F5F5F5] rank-number">
                        {roundScore?.roundTotal ?? '—'}
                      </span>
                      <span className="text-xs text-[#858585]">/{roundMax}</span>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {criteria.map(c => {
                      const scoreVal = roundScore?.criteriaScores?.find(cs => cs.criterionId === c.id)?.value;
                      return (
                        <div key={c.id} className="flex items-center justify-between text-xs">
                          <span className="text-[#858585] truncate pr-2">{c.name}</span>
                          <span className="font-mono text-[#F5F5F5] font-semibold">
                            {scoreVal !== null && scoreVal !== undefined ? scoreVal : '—'}
                            <span className="text-[#555]">/{c.maxMarks}</span>
                          </span>
                        </div>
                      );
                    })}
                    {(roundScore?.negativeMarks ?? 0) > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#E50914] truncate pr-2">Negative Marks</span>
                        <span className="font-mono text-[#E50914] font-semibold">
                          −{roundScore?.negativeMarks}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function TeamDetailsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#090909] flex items-center justify-center">
        <LoadingState message="Loading team profile..." />
      </div>
    }>
      <TeamDetailsContent />
    </Suspense>
  );
}
