// src/app/admin/rounds/page.tsx
'use client';

import { useCompetition } from '@/hooks/useCompetition';
import { useAuth } from '@/hooks/useAuth';
import { initializeCompetition, updateRoundStatus } from '@/lib/services/competitionService';
import { logActivity } from '@/lib/services/adminService';
import { LoadingState } from '@/components/shared/LoadingState';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChevronRight, Lock, Play, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import type { Round } from '@/types/competition';
import { getRoundCriteria, getRoundMaxMarks } from '@/lib/utils/scoring';

function RoundStatusBadge({ status }: { status: Round['status'] }) {
  const configs = {
    not_started: { label: 'Not Started', cls: 'text-[#858585] border-[rgba(185,185,185,0.2)] bg-[rgba(185,185,185,0.05)]' },
    in_progress: { label: 'In Progress', cls: 'text-[#E50914] border-[rgba(229,9,20,0.3)] bg-[rgba(229,9,20,0.08)]' },
    completed: { label: 'Completed', cls: 'text-[#16A34A] border-[rgba(22,163,74,0.3)] bg-[rgba(22,163,74,0.08)]' },
    locked: { label: 'Locked', cls: 'text-[#D6A84B] border-[rgba(214,168,75,0.3)] bg-[rgba(214,168,75,0.08)]' },
  };
  const cfg = configs[status] || configs.not_started;
  return <span className={`text-xs px-2 py-0.5 rounded border font-medium ${cfg.cls}`}>{cfg.label}</span>;
}

export default function RoundsPage() {
  const { competition, loading, error } = useCompetition();
  const { adminUser } = useAuth();
  const [updating, setUpdating] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(false);

  const handleInitialize = async () => {
    setInitializing(true);
    try {
      await initializeCompetition('Cobot-ex Championship 2026', adminUser?.uid || 'admin');
      toast.success('Competition initialized');
    } catch (err: any) {
      toast.error('Failed to initialize competition', { description: err?.message });
    } finally {
      setInitializing(false);
    }
  };

  const handleStatusChange = async (roundId: string, status: Round['status']) => {
    setUpdating(roundId);
    try {
      await updateRoundStatus(roundId, status, adminUser?.uid || 'admin');
      if (adminUser) {
        await logActivity(adminUser.uid, adminUser.email, 'round_status_change', {
          affectedRecord: roundId,
          affectedRecordType: 'round',
          newValue: { status },
        });
      }
      toast.success(`Round status updated to ${status.replace('_', ' ')}`);
    } catch (err: any) {
      toast.error('Failed to update round status', { description: err?.message });
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return <LoadingState message="Loading rounds..." />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <h1 className="text-xl font-bold text-[#F5F5F5] mb-2">Could not load rounds</h1>
        <p className="text-[#858585] text-sm">{error.message}</p>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="max-w-xl mx-auto text-center py-12 space-y-4">
        <h1 className="text-xl font-bold text-[#F5F5F5]">Competition not initialized</h1>
        <p className="text-[#858585] text-sm">
          Create the default competition, rounds, and marking criteria to begin scoring.
        </p>
        <Button
          onClick={handleInitialize}
          disabled={initializing}
          className="bg-[#E50914] hover:bg-[#FF3028] text-white"
        >
          {initializing ? 'Initializing...' : 'Initialize Competition'}
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#F5F5F5]">Rounds & Scoring</h1>
        <p className="text-[#858585] text-sm mt-1">Manage competition rounds and enter team scores</p>
      </div>

      <div className="space-y-4">
        {competition.rounds.map((round, i) => (
          <div key={round.id} className="card-dark rounded-xl p-6 border border-[rgba(185,185,185,0.08)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#190707] border border-[rgba(229,9,20,0.2)] flex items-center justify-center">
                  <span className="text-[#E50914] font-bold text-lg">{i + 1}</span>
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="font-semibold text-[#F5F5F5]">{round.name}</h2>
                    <RoundStatusBadge status={round.status} />
                  </div>
                  <p className="text-xs text-[#858585] mt-0.5">
                    Max {getRoundMaxMarks(round, competition.criteria)} marks · {getRoundCriteria(competition, round.id).length} criteria
                  </p>
                  {round.startedAt && (
                    <p className="text-xs text-[#858585]">
                      Started: {new Date(round.startedAt).toLocaleString()}
                    </p>
                  )}
                  {round.completedAt && (
                    <p className="text-xs text-[#858585]">
                      Completed: {new Date(round.completedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {round.status === 'not_started' && (
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange(round.id, 'in_progress')}
                    disabled={updating === round.id}
                    className="bg-[#E50914] hover:bg-[#FF3028] text-white flex items-center gap-2"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Start Round
                  </Button>
                )}
                {round.status === 'in_progress' && (
                  <>
                    <Link href={`/admin/rounds/${round.id}`}>
                      <Button size="sm" className="bg-[#E50914] hover:bg-[#FF3028] text-white flex items-center gap-2">
                        Enter Scores
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(round.id, 'completed')}
                      disabled={updating === round.id}
                      className="border-[rgba(22,163,74,0.3)] text-[#16A34A] hover:bg-[rgba(22,163,74,0.08)] flex items-center gap-2"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Mark Complete
                    </Button>
                  </>
                )}
                {round.status === 'completed' && (
                  <>
                    <Link href={`/admin/rounds/${round.id}`}>
                      <Button size="sm" variant="outline" className="border-[rgba(185,185,185,0.2)] text-[#858585] flex items-center gap-2">
                        View Scores
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(round.id, 'locked')}
                      disabled={updating === round.id}
                      className="border-[rgba(214,168,75,0.3)] text-[#D6A84B] hover:bg-[rgba(214,168,75,0.08)] flex items-center gap-2"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Lock
                    </Button>
                  </>
                )}
                {round.status === 'locked' && (
                  <Link href={`/admin/rounds/${round.id}`}>
                    <Button size="sm" variant="outline" className="border-[rgba(185,185,185,0.2)] text-[#858585] flex items-center gap-2">
                      View Scores
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Criteria summary */}
      <div className="card-dark rounded-xl p-6 space-y-5">
        <h2 className="font-semibold text-[#F5F5F5]">Marking Criteria by Round</h2>
        {competition.rounds.map(round => {
          const criteria = getRoundCriteria(competition, round.id);
          return (
            <div key={round.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-[#F5F5F5]">{round.name}</h3>
                <span className="text-xs text-[#858585]">
                  {getRoundMaxMarks(round, competition.criteria)} marks
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {criteria.map(c => (
                  <div key={c.id} className="p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(185,185,185,0.08)] text-center">
                    <p className="text-sm font-medium text-[#F5F5F5] mb-1">{c.name}</p>
                    <p className="text-xs text-[#858585]">{c.maxMarks} marks</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        <div className="flex justify-end">
          <Link href="/admin/settings">
            <Button variant="ghost" size="sm" className="text-[#E50914] text-xs">
              Configure Criteria →
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

