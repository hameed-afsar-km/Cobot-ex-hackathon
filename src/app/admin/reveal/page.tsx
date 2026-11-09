// src/app/admin/reveal/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, Trophy, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { LoadingState } from '@/components/shared/LoadingState';
import { useCompetition } from '@/hooks/useCompetition';
import { useReveal } from '@/hooks/useReveal';
import { useAuth } from '@/hooks/useAuth';
import { completeReveal, initiateReveal, resetReveal, DEFAULT_ANIMATION_CONFIG } from '@/lib/services/revealService';
import { getAllTeams } from '@/lib/services/teamService';
import { getAllScores } from '@/lib/services/scoreService';
import { logActivity } from '@/lib/services/adminService';
import { rankTeams } from '@/lib/utils/ranking';
import { calculateFinalScore, getCompetitionMaxScore, MAX_FINAL_SCORE } from '@/lib/utils/scoring';
import type { RevealTopThree } from '@/types/leaderboard';
import type { Team } from '@/types/team';
import type { Score } from '@/types/score';
import { toast } from 'sonner';
import Link from 'next/link';
import { DEFAULT_COMPETITION_ID } from '@/lib/services/leaderboardService';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function ReadinessCheck({ label, ok, warning }: { label: string; ok: boolean; warning?: string }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${
      ok ? 'border-[rgba(22,163,74,0.2)] bg-[rgba(22,163,74,0.05)]' : 'border-[rgba(214,168,75,0.2)] bg-[rgba(214,168,75,0.05)]'
    }`}>
      {ok ? <CheckCircle className="w-4 h-4 text-[#16A34A] mt-0.5" /> : <AlertTriangle className="w-4 h-4 text-[#D6A84B] mt-0.5" />}
      <div>
        <p className={`text-sm font-medium ${ok ? 'text-[#16A34A]' : 'text-[#D6A84B]'}`}>{label}</p>
        {warning && <p className="text-xs text-[#858585] mt-0.5">{warning}</p>}
      </div>
    </div>
  );
}

export default function RevealAdminPage() {
  const { competition, loading: compLoading } = useCompetition();
  const { revealState, loading: revealLoading } = useReveal(DEFAULT_COMPETITION_ID);
  const { adminUser } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [topThree, setTopThree] = useState<RevealTopThree | null>(null);
  const [confirmReveal, setConfirmReveal] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [acting, setActing] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const completingRef = useRef(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [t, s] = await Promise.all([getAllTeams(), getAllScores()]);
        setTeams(t);
        setScores(s);

        // Calculate top 3
        if (competition) {
          const roundIds = competition.rounds.map(r => r.id);
          const scoreMap = new Map(s.map(sc => [`${sc.teamId}_${sc.roundId}`, sc]));
          const entries = t.map(team => {
            const roundScores: Record<string, number | null> = {};
            const evaluatedRounds: string[] = [];
            for (const rid of roundIds) {
              const sc = scoreMap.get(`${team.id}_${rid}`);
              const total = sc?.roundTotal ?? null;
              roundScores[rid] = total;
              if (total !== null) evaluatedRounds.push(rid);
            }
            return {
              teamId: team.id,
              teamName: team.teamName,
              finalScore: calculateFinalScore(Object.values(roundScores)),
              roundScores,
              evaluatedRounds,
            };
          });
          const ranked = rankTeams(entries, competition.tieBreakConfig?.policy || 'shared_position');
          if (ranked.length >= 3) {
            setTopThree({
              first: { teamId: ranked[0].teamId, teamName: ranked[0].teamName, finalScore: ranked[0].finalScore },
              second: { teamId: ranked[1].teamId, teamName: ranked[1].teamName, finalScore: ranked[1].finalScore },
              third: { teamId: ranked[2].teamId, teamName: ranked[2].teamName, finalScore: ranked[2].finalScore },
            });
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setDataLoading(false);
      }
    };
    if (!compLoading) load();
  }, [competition, compLoading]);

  useEffect(() => {
    if (!competition || revealState?.status !== 'revealing' || !revealState.startedAt) return;
    if (completingRef.current) return;

    const stageDuration =
      revealState.animationConfig?.stageDuration ?? DEFAULT_ANIMATION_CONFIG.stageDuration;
    const totalDuration = Object.values(stageDuration).reduce(
      (total, duration) => total + (duration ?? 0),
      0
    );
    const remaining = Math.max(0, revealState.startedAt + totalDuration - Date.now()) + 500;

    const timer = window.setTimeout(async () => {
      if (completingRef.current) return;
      completingRef.current = true;
      try {
        await completeReveal(DEFAULT_COMPETITION_ID);
        if (adminUser) {
          await logActivity(adminUser.uid, adminUser.email, 'reveal_complete', {
            affectedRecordType: 'reveal',
          });
        }
        toast.success('Reveal complete — the top 3 are now visible on the public leaderboard.');
      } catch (err) {
        toast.error('Could not finalize reveal', { description: errorMessage(err) });
      } finally {
        completingRef.current = false;
      }
    }, remaining);

    return () => window.clearTimeout(timer);
  }, [competition, revealState, adminUser]);

  const allRoundsComplete = competition?.rounds?.every(r => r.status === 'completed' || r.status === 'locked') ?? false;
  const hasTopThree = !!topThree;
  const evaluatedTeams = new Set(scores.filter(s => s.evaluationStatus === 'evaluated').map(s => s.teamId)).size;
  const allEvaluated = teams.length > 0 && evaluatedTeams >= teams.length;

  const handleInitiateReveal = async () => {
    if (!topThree || !competition || !adminUser) return;
    setActing(true);
    try {
      await initiateReveal(competition, topThree, adminUser.uid);
      await logActivity(adminUser.uid, adminUser.email, 'reveal_start', {
        affectedRecordType: 'reveal',
        metadata: { topThree },
      });
      toast.success('Winner reveal started! All screens will sync.');
    } catch (err) {
      toast.error('Failed to start reveal', { description: errorMessage(err) });
    } finally {
      setActing(false);
      setConfirmReveal(false);
    }
  };

  const handleFinalizeReveal = async () => {
    if (!adminUser || completingRef.current) return;
    completingRef.current = true;
    setActing(true);
    try {
      await completeReveal(DEFAULT_COMPETITION_ID);
      await logActivity(adminUser.uid, adminUser.email, 'reveal_complete', {
        affectedRecordType: 'reveal',
      });
      toast.success('Reveal finalized — the top 3 are now visible on the public leaderboard.');
    } catch (err) {
      toast.error('Failed to finalize reveal', { description: errorMessage(err) });
    } finally {
      completingRef.current = false;
      setActing(false);
    }
  };

  const handleResetReveal = async () => {
    if (!adminUser) return;
    setActing(true);
    try {
      await resetReveal(DEFAULT_COMPETITION_ID);
      await logActivity(adminUser.uid, adminUser.email, 'reveal_reset', { affectedRecordType: 'reveal' });
      toast.success('Reveal reset successfully');
    } catch (err) {
      toast.error('Failed to reset reveal', { description: errorMessage(err) });
    } finally {
      setActing(false);
      setConfirmReset(false);
    }
  };

  if (compLoading || revealLoading || dataLoading) {
    return <LoadingState message="Loading reveal controls..." />;
  }

  const revealStatus = revealState?.status ?? 'concealed';
  const maxFinalScore = competition ? getCompetitionMaxScore(competition) : MAX_FINAL_SCORE;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F5F5F5]">Reveal Control Center</h1>
          <p className="text-[#858585] text-sm mt-1">Manage the cinematic winner reveal</p>
        </div>
        <Link href="/reveal" target="_blank">
          <Button variant="outline" size="sm" className="border-[rgba(185,185,185,0.2)] text-[#858585] flex items-center gap-2">
            <ExternalLink className="w-3.5 h-3.5" />
            Open Reveal View
          </Button>
        </Link>
      </div>

      {/* Current status */}
      <div className={`p-5 rounded-xl border ${
        revealStatus === 'concealed' ? 'border-[rgba(185,185,185,0.12)] bg-[#111]' :
        revealStatus === 'revealing' ? 'border-[rgba(229,9,20,0.3)] bg-[rgba(229,9,20,0.05)]' :
        'border-[rgba(255,215,0,0.3)] bg-[rgba(255,215,0,0.05)]'
      }`}>
        <div className="flex items-center gap-3">
          <Trophy className={`w-6 h-6 ${
            revealStatus === 'concealed' ? 'text-[#858585]' :
            revealStatus === 'revealing' ? 'text-[#E50914]' :
            'text-[#FFD700]'
          }`} />
          <div>
            <p className="font-semibold text-[#F5F5F5]">Reveal Status</p>
            <p className="text-sm text-[#858585] capitalize">{revealStatus}</p>
          </div>
          {revealStatus === 'revealing' && (
            <div className="ml-auto flex items-center gap-2 text-[#E50914] text-sm font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E50914] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E50914]" />
              </span>
              Live Broadcast
            </div>
          )}
        </div>
      </div>

      {/* Readiness checks */}
      <div>
        <h2 className="text-sm font-semibold text-[#858585] uppercase tracking-wider mb-3">Pre-Reveal Checklist</h2>
        <div className="space-y-2">
          <ReadinessCheck
            label={`All 3 rounds complete (${competition?.rounds?.filter(r => r.status === 'completed' || r.status === 'locked').length ?? 0}/3)`}
            ok={allRoundsComplete}
            warning={!allRoundsComplete ? 'Complete and verify all rounds before revealing the winner.' : undefined}
          />
          <ReadinessCheck
            label={`All teams evaluated (${evaluatedTeams}/${teams.length})`}
            ok={allEvaluated}
            warning={!allEvaluated ? `${teams.length - evaluatedTeams} teams still pending evaluation.` : undefined}
          />
          <ReadinessCheck
            label="Top 3 teams identified"
            ok={hasTopThree}
            warning={!hasTopThree ? 'Need at least 3 teams with scores to reveal.' : undefined}
          />
        </div>
      </div>

      {/* Top 3 preview */}
      {topThree && (
        <div>
          <h2 className="text-sm font-semibold text-[#858585] uppercase tracking-wider mb-3">Final Standings (Top 3)</h2>
          <div className="space-y-2">
            {[
              { pos: '🥇 1st Place', team: topThree.first },
              { pos: '🥈 2nd Place', team: topThree.second },
              { pos: '🥉 3rd Place', team: topThree.third },
            ].map(({ pos, team }) => (
              <div key={team.teamId} className="flex items-center justify-between p-3 card-dark rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{pos.split(' ')[0]}</span>
                  <p className="font-medium text-[#F5F5F5]">{team.teamName}</p>
                </div>
                <span className="text-xl font-bold text-[#F5F5F5] rank-number">
                  {team.finalScore}<span className="text-sm text-[#858585] font-normal">/{maxFinalScore}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        {revealStatus === 'concealed' && (
          <Button
            onClick={() => setConfirmReveal(true)}
            disabled={!hasTopThree || acting}
            className="bg-[#E50914] hover:bg-[#FF3028] text-white glow-red-sm flex items-center gap-2 disabled:opacity-40"
          >
            <Play className="w-4 h-4" />
            Launch Winner Reveal
          </Button>
        )}
        {revealStatus === 'revealing' && (
          <Button
            onClick={handleFinalizeReveal}
            disabled={acting}
            variant="outline"
            className="border-[rgba(22,163,74,0.3)] text-[#16A34A] hover:bg-[rgba(22,163,74,0.08)] flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Finalize & Unblur Leaderboard
          </Button>
        )}
        {revealStatus === 'revealed' && (
          <Button
            onClick={handleFinalizeReveal}
            disabled={acting}
            variant="outline"
            className="border-[rgba(22,163,74,0.3)] text-[#16A34A] hover:bg-[rgba(22,163,74,0.08)] flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Re-sync Public Leaderboard
          </Button>
        )}
        {(revealStatus === 'revealing' || revealStatus === 'revealed') && (
          <Button
            onClick={() => setConfirmReset(true)}
            variant="outline"
            disabled={acting}
            className="border-[rgba(229,9,20,0.3)] text-[#E50914] hover:bg-[rgba(229,9,20,0.08)] flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Reveal to Concealed
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirmReveal}
        onOpenChange={setConfirmReveal}
        title="Start Winner Reveal"
        description="This broadcasts the full reveal sequence to every connected public screen. Once started it runs automatically: 3rd, 2nd and 1st names unblur, the top three shuffle, everything re-blurs, then the podium fills from 3rd to 1st. Keep this control center open until the sequence finishes so the leaderboard can automatically unblur; you can also finalize manually. Proceed?"
        confirmLabel="Start Reveal"
        onConfirm={handleInitiateReveal}
      />
      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset Reveal"
        description="This will conceal the top three again and reset the reveal sequence to idle. Are you sure?"
        confirmLabel="Reset"
        variant="destructive"
        onConfirm={handleResetReveal}
      />
    </div>
  );
}

