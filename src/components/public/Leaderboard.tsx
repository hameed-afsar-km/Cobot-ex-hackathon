// src/components/public/Leaderboard.tsx
'use client';

import { motion } from 'framer-motion';
import { LeaderboardRow } from './LeaderboardRow';
import { LeaderboardSkeleton } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { Trophy } from 'lucide-react';
import type { PublicLeaderboard } from '@/types/leaderboard';

interface LeaderboardProps {
  leaderboard: PublicLeaderboard | null;
  loading: boolean;
}

export function Leaderboard({ leaderboard, loading }: LeaderboardProps) {
  if (loading) {
    return (
      <div className="card-dark rounded-xl overflow-hidden">
        <LeaderboardSkeleton />
      </div>
    );
  }

  if (!leaderboard || leaderboard.rankings.length === 0) {
    return (
      <div className="card-dark rounded-xl">
        <EmptyState
          icon={Trophy}
          title="No teams yet"
          description="Teams will appear here once the competition begins."
        />
      </div>
    );
  }

  const topThree = leaderboard.rankings.filter(r => r.rank <= 3);
  const rest = leaderboard.rankings.filter(r => r.rank > 3);

  return (
    <div className="rounded-xl overflow-hidden border border-[rgba(185,185,185,0.08)] bg-[#0d0d0d]">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-3 bg-[#111111] border-b border-[rgba(185,185,185,0.08)]">
        <div className="w-8 text-xs font-semibold text-[#858585] uppercase tracking-wider text-center">
          #
        </div>
        <div className="w-5" />
        <div className="flex-1 text-xs font-semibold text-[#858585] uppercase tracking-wider">
          Team
        </div>
        <div className="text-xs font-semibold text-[#858585] uppercase tracking-wider">
          Score
        </div>
      </div>

      {/* Top 3 */}
      {topThree.map((row, i) => (
        <LeaderboardRow
          key={row.teamId}
          row={row}
          animateIn
          delay={i * 0.08}
        />
      ))}

      {/* Divider if top 3 and rest */}
      {topThree.length > 0 && rest.length > 0 && (
        <div className="h-px bg-gradient-to-r from-transparent via-[rgba(229,9,20,0.3)] to-transparent" />
      )}

      {/* Rest */}
      {rest.map((row, i) => (
        <LeaderboardRow
          key={row.teamId}
          row={row}
          animateIn
          delay={topThree.length * 0.08 + i * 0.05}
        />
      ))}

      {/* Provisional notice */}
      {leaderboard.isProvisional && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="px-4 py-3 bg-[rgba(214,168,75,0.05)] border-t border-[rgba(214,168,75,0.15)]"
        >
          <p className="text-xs text-[#D6A84B] text-center">
            ⚡ Provisional standings — scoring is in progress. Final rankings will be revealed at the end of the competition.
          </p>
        </motion.div>
      )}
    </div>
  );
}

