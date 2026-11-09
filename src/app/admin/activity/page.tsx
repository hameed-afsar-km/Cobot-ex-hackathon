// src/app/admin/activity/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { getActivityLogs } from '@/lib/services/adminService';
import type { ActivityLog } from '@/types/admin';
import { Activity } from 'lucide-react';

const ACTION_LABELS: Record<string, string> = {
  admin_login: 'Admin Login',
  team_import: 'Team Import',
  team_create: 'Team Created',
  team_update: 'Team Updated',
  team_delete: 'Team Deleted',
  score_submit: 'Scores Submitted',
  score_update: 'Scores Updated',
  round_status_change: 'Round Status Changed',
  competition_settings_change: 'Settings Changed',
  reveal_start: 'Reveal Started',
  reveal_complete: 'Reveal Completed',
  reveal_reset: 'Reveal Reset',
  scores_reset: 'Scores Reset',
  teams_reset: 'Teams Reset',
  round_progress_reset: 'Round Progress Reset',
  competition_reset: 'Competition Reset',
  admin_added: 'Admin Added',
  admin_removed: 'Admin Removed',
  admin_role_changed: 'Admin Role Changed',
};

const ACTION_COLORS: Record<string, string> = {
  admin_login: 'text-[#858585]',
  team_import: 'text-[#E50914]',
  team_create: 'text-[#16A34A]',
  team_update: 'text-[#D6A84B]',
  team_delete: 'text-[#E50914]',
  score_submit: 'text-[#16A34A]',
  score_update: 'text-[#D6A84B]',
  round_status_change: 'text-[#E50914]',
  reveal_start: 'text-[#FFD700]',
  reveal_complete: 'text-[#16A34A]',
  reveal_reset: 'text-[#E50914]',
  scores_reset: 'text-[#E50914]',
  teams_reset: 'text-[#E50914]',
  round_progress_reset: 'text-[#D6A84B]',
  competition_reset: 'text-[#E50914]',
};

export default function ActivityPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getActivityLogs({ limitCount: 200 })
      .then(setLogs)
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState message="Loading activity logs..." />;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#F5F5F5]">Activity Log</h1>
        <p className="text-[#858585] text-sm mt-1">Audit trail of all administrative actions</p>
      </div>

      {logs.length === 0 ? (
        <div className="card-dark rounded-xl">
          <EmptyState icon={Activity} title="No activity recorded" description="Administrative actions will appear here automatically." />
        </div>
      ) : (
        <div className="card-dark rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(185,185,185,0.08)] bg-[rgba(255,255,255,0.02)]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#858585] uppercase tracking-wider">Time</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#858585] uppercase tracking-wider">Action</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#858585] uppercase tracking-wider">Admin</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#858585] uppercase tracking-wider">Target</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-b border-[rgba(185,185,185,0.05)] hover:bg-[rgba(255,255,255,0.01)]">
                  <td className="px-4 py-3 text-xs text-[#858585] font-mono whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-medium ${ACTION_COLORS[log.action] ?? 'text-[#F5F5F5]'}`}>
                      {ACTION_LABELS[log.action] ?? log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#B9B9B9]">{log.adminEmail}</td>
                  <td className="px-4 py-3 text-sm text-[#858585] font-mono">
                    {log.affectedRecord ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

