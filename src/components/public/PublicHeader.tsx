// src/components/public/PublicHeader.tsx
'use client';

import { motion } from 'framer-motion';
import { Trophy, Radio, Clock, Users } from 'lucide-react';
import type { PublicLeaderboard } from '@/types/leaderboard';

interface PublicHeaderProps {
  leaderboard: PublicLeaderboard | null;
}

function LiveIndicator() {
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E50914] opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E50914]" />
      </span>
      <span className="text-[#E50914] uppercase tracking-wider">Live</span>
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    upcoming: 'Upcoming',
    in_progress: 'In Progress',
    completed: 'Completed',
    revealed: 'Winner Revealed',
  };
  const colors: Record<string, string> = {
    upcoming: 'text-[#D6A84B] border-[rgba(214,168,75,0.3)] bg-[rgba(214,168,75,0.08)]',
    in_progress: 'text-[#E50914] border-[rgba(229,9,20,0.3)] bg-[rgba(229,9,20,0.08)]',
    completed: 'text-[#16A34A] border-[rgba(22,163,74,0.3)] bg-[rgba(22,163,74,0.08)]',
    revealed: 'text-[#FFD700] border-[rgba(255,215,0,0.3)] bg-[rgba(255,215,0,0.08)]',
  };

  return (
    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${colors[status] ?? colors.upcoming}`}>
      {labels[status] ?? status}
    </span>
  );
}

export function PublicHeader({ leaderboard }: PublicHeaderProps) {
  return (
    <header className="relative border-b border-[rgba(229,9,20,0.15)] bg-[#090909]">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-crimson-gradient pointer-events-none" />
      
      <div className="relative container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Logo & Title */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-[#190707] border border-[rgba(229,9,20,0.4)] flex items-center justify-center glow-red-sm">
              <Trophy className="w-6 h-6 text-[#E50914]" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#F5F5F5] leading-tight">
                {leaderboard?.competitionName ?? 'Competition Leaderboard'}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                {leaderboard && <StatusBadge status={leaderboard.status} />}
                {leaderboard?.isProvisional && (
                  <span className="text-xs text-[#D6A84B]">Provisional Standings</span>
                )}
              </div>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-wrap items-center gap-4 text-sm"
          >
            {leaderboard && (
              <>
                <div className="flex items-center gap-1.5 text-[#858585]">
                  <Users className="w-4 h-4" />
                  <span>{leaderboard.totalTeams} Teams</span>
                </div>
                {leaderboard.currentRound && (
                  <div className="flex items-center gap-1.5 text-[#858585]">
                    <Radio className="w-4 h-4 text-[#E50914]" />
                    <span>
                      {leaderboard.currentRound.replace('round', 'Round ')}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-[#858585]">
                  <Clock className="w-4 h-4" />
                  <span>
                    {leaderboard.updatedAt
                      ? new Date(leaderboard.updatedAt).toLocaleTimeString()
                      : '—'}
                  </span>
                </div>
              </>
            )}
            <LiveIndicator />
          </motion.div>
        </div>
      </div>
    </header>
  );
}

