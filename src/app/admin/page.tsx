// src/app/admin/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Trophy, Target, CheckCircle, Clock, TrendingUp,
  AlertTriangle, Play, ArrowRight, Upload, Plus
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCompetition } from '@/hooks/useCompetition';
import { getAllTeams } from '@/lib/services/teamService';
import { getAllScores } from '@/lib/services/scoreService';
import { getActivityLogs } from '@/lib/services/adminService';
import type { Team } from '@/types/team';
import type { Score } from '@/types/score';
import type { ActivityLog } from '@/types/admin';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/shared/LoadingState';

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = 'red',
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: 'red' | 'green' | 'amber' | 'silver';
}) {
  const colorMap = {
    red: 'text-[#E50914] bg-[rgba(229,9,20,0.08)] border-[rgba(229,9,20,0.2)]',
    green: 'text-[#16A34A] bg-[rgba(22,163,74,0.08)] border-[rgba(22,163,74,0.2)]',
    amber: 'text-[#D6A84B] bg-[rgba(214,168,75,0.08)] border-[rgba(214,168,75,0.2)]',
    silver: 'text-[#B9B9B9] bg-[rgba(185,185,185,0.08)] border-[rgba(185,185,185,0.2)]',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-dark p-5 rounded-xl border border-[rgba(185,185,185,0.08)]"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-[#858585] font-medium uppercase tracking-wider mb-2">{label}</p>
          <p className="text-3xl font-bold text-[#F5F5F5] rank-number">{value}</p>
          {sub && <p className="text-xs text-[#858585] mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </motion.div>
  );
}

function ActionCard({ href, icon: Icon, label, description }: {
  href: string;
  icon: React.ElementType;
  label: string;
  description: string;
}) {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="card-dark p-4 rounded-xl border border-[rgba(185,185,185,0.08)] hover:border-[rgba(229,9,20,0.3)] transition-colors cursor-pointer group"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#190707] border border-[rgba(229,9,20,0.2)] flex items-center justify-center">
            <Icon className="w-4 h-4 text-[#E50914]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#F5F5F5]">{label}</p>
            <p className="text-xs text-[#858585] truncate">{description}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-[#858585] group-hover:text-[#E50914] transition-colors flex-shrink-0" />
        </div>
      </motion.div>
    </Link>
  );
}

function RecentActivityItem({ log }: { log: ActivityLog }) {
  const actionLabels: Record<string, string> = {
    team_import: 'Imported teams',
    team_create: 'Added team',
    team_update: 'Updated team',
    team_delete: 'Deleted team',
    score_submit: 'Submitted scores',
    score_update: 'Updated scores',
    round_status_change: 'Changed round status',
    competition_settings_change: 'Updated settings',
    reveal_start: 'Started reveal',
    reveal_reset: 'Reset reveal',
    admin_added: 'Added administrator',
    admin_removed: 'Removed administrator',
    admin_login: 'Logged in',
  };

  return (
    <div className="flex items-start gap-3 py-3 border-b border-[rgba(185,185,185,0.06)] last:border-0">
      <div className="w-1.5 h-1.5 rounded-full bg-[#E50914] mt-2 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#F5F5F5]">
          {actionLabels[log.action] ?? log.action}
          {log.affectedRecord && (
            <span className="text-[#858585]"> – {log.affectedRecord}</span>
          )}
        </p>
        <p className="text-xs text-[#858585]">{log.adminEmail}</p>
      </div>
      <span className="text-xs text-[#858585] flex-shrink-0">
        {new Date(log.timestamp).toLocaleTimeString()}
      </span>
    </div>
  );
}

export default function AdminOverviewPage() {
  const { adminUser } = useAuth();
  const { competition, loading: compLoading } = useCompetition();
  const [teams, setTeams] = useState<Team[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [t, s, l] = await Promise.all([
          getAllTeams(),
          getAllScores(),
          getActivityLogs({ limitCount: 10 }),
        ]);
        setTeams(t);
        setScores(s);
        setLogs(l);
      } finally {
        setDataLoading(false);
      }
    };
    load();
  }, []);

  if (compLoading || dataLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingState message="Loading dashboard..." />
      </div>
    );
  }

  const evaluatedTeams = new Set(scores.filter(s => s.evaluationStatus === 'evaluated').map(s => s.teamId)).size;
  const totalMembers = teams.reduce((sum, t) => sum + t.members.length, 0);
  const completedRounds = competition?.rounds.filter(r => r.status === 'completed' || r.status === 'locked').length ?? 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-[#F5F5F5]">Dashboard</h1>
        <p className="text-[#858585] text-sm mt-1">
          Welcome back, {adminUser?.displayName?.split(' ')[0] ?? 'Admin'}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Teams" value={teams.length} sub={`${totalMembers} members`} color="silver" />
        <StatCard icon={CheckCircle} label="Evaluated" value={evaluatedTeams} sub={`of ${teams.length} teams`} color="green" />
        <StatCard icon={Target} label="Rounds Complete" value={`${completedRounds}/3`} color="amber" />
        <StatCard icon={Trophy} label="Competition" value={competition?.name ?? 'Not Set'} sub={competition?.status ?? '—'} color="red" />
      </div>

      {/* Quick Actions + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick actions */}
        <div>
          <h2 className="text-sm font-semibold text-[#858585] uppercase tracking-wider mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <ActionCard
              href="/admin/teams/import"
              icon={Upload}
              label="Import Teams"
              description="Upload CSV or Excel file"
            />
            <ActionCard
              href="/admin/teams"
              icon={Plus}
              label="Add Team Manually"
              description="Register a single team"
            />
            <ActionCard
              href="/admin/rounds"
              icon={Target}
              label="Enter Scores"
              description="Manage round evaluations"
            />
            <ActionCard
              href="/admin/leaderboard"
              icon={TrendingUp}
              label="View Leaderboard"
              description="Preview current rankings"
            />
            <ActionCard
              href="/admin/reveal"
              icon={Play}
              label="Reveal Controls"
              description="Manage the winner reveal"
            />
          </div>
        </div>

        {/* Recent activity */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#858585] uppercase tracking-wider">Recent Activity</h2>
            <Link href="/admin/activity" className="text-xs text-[#E50914] hover:underline">View all</Link>
          </div>
          <div className="card-dark rounded-xl p-4">
            {logs.length === 0 ? (
              <p className="text-[#858585] text-sm text-center py-6">No activity yet</p>
            ) : (
              logs.map(log => <RecentActivityItem key={log.id} log={log} />)
            )}
          </div>
        </div>
      </div>

      {/* Competition status */}
      {competition && (
        <div className="card-dark rounded-xl p-5 border border-[rgba(185,185,185,0.08)]">
          <h2 className="text-sm font-semibold text-[#858585] uppercase tracking-wider mb-4">Competition Status</h2>
          <div className="grid grid-cols-3 gap-4">
            {competition.rounds.map(round => {
              const statusColors: Record<string, string> = {
                not_started: 'text-[#858585] border-[rgba(185,185,185,0.2)]',
                in_progress: 'text-[#E50914] border-[rgba(229,9,20,0.4)]',
                completed: 'text-[#16A34A] border-[rgba(22,163,74,0.4)]',
                locked: 'text-[#D6A84B] border-[rgba(214,168,75,0.4)]',
              };
              return (
                <div key={round.id} className={`p-3 rounded-lg border ${statusColors[round.status]} bg-[rgba(255,255,255,0.02)] text-center`}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1">{round.name}</p>
                  <p className="text-xs capitalize">{round.status.replace('_', ' ')}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

