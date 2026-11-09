// src/components/public/LeaderboardRow.tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, ArrowUp, ArrowDown, Minus, Sparkles, Users, Trophy, Lock } from 'lucide-react';
import type { PublicTeamRow } from '@/types/leaderboard';

interface LeaderboardRowProps {
  row: PublicTeamRow;
  animateIn?: boolean;
  delay?: number;
}

function MovementIndicator({ movement }: { movement: PublicTeamRow['movement'] }) {
  let content: React.ReactNode;
  let color = 'text-[#858585]';

  if (movement.direction === 'up') {
    color = 'text-[#16A34A]';
    content = (
      <>
        <ArrowUp className="w-3 h-3" />
        {movement.positions > 0 && <span className="text-xs">{movement.positions}</span>}
      </>
    );
  } else if (movement.direction === 'down') {
    color = 'text-[#E50914]';
    content = (
      <>
        <ArrowDown className="w-3 h-3" />
        {movement.positions > 0 && <span className="text-xs">{movement.positions}</span>}
      </>
    );
  } else if (movement.direction === 'new') {
    color = 'text-[#D6A84B]';
    content = <Sparkles className="w-3 h-3" />;
  } else {
    content = <Minus className="w-3 h-3" />;
  }

  return (
    <motion.span
      key={`${movement.direction}-${movement.positions}`}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`flex items-center gap-0.5 ${color}`}
    >
      {content}
    </motion.span>
  );
}

function RankDisplay({ rank }: { rank: number }) {
  if (rank === 1) {
    return <span className="rank-number text-2xl font-bold rank-gold">01</span>;
  }
  if (rank === 2) {
    return <span className="rank-number text-2xl font-bold rank-silver">02</span>;
  }
  if (rank === 3) {
    return <span className="rank-number text-2xl font-bold rank-bronze">03</span>;
  }
  return (
    <span className="rank-number text-xl font-bold text-[#858585]">
      {String(rank).padStart(2, '0')}
    </span>
  );
}

function ConcealedRow({ row }: { row: PublicTeamRow }) {
  return (
    <div className="flex items-center gap-4 px-4 py-4 row-concealed border-b border-[rgba(229,9,20,0.1)]">
      <div className="w-8 flex justify-center">
        <RankDisplay rank={row.rank} />
      </div>
      <div className="w-5 flex justify-center">
        <MovementIndicator movement={row.movement} />
      </div>
      <div className="flex-1 min-w-0">
        <span
          aria-hidden
          className="font-semibold text-[#F5F5F5] truncate block blur-[6px] select-none"
        >
          {row.teamName ?? '████████████'}
        </span>
        <span className="text-xs text-[#E50914] mt-1 flex items-center gap-1">
          <Lock className="w-3 h-3" />
          Concealed until reveal
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="text-xl font-bold text-[#F5F5F5] rank-number blur-[6px] select-none"
        >
          {row.finalScore ?? '000'}
        </span>
        <span className="text-xs text-[#858585]">/150</span>
      </div>
    </div>
  );
}

export function LeaderboardRow({ row, animateIn = true, delay = 0 }: LeaderboardRowProps) {
  const [expanded, setExpanded] = useState(false);

  if (row.isConcealed) {
    return (
      <motion.div
        layout
        initial={animateIn ? { opacity: 0, x: -20 } : false}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay, duration: 0.4, layout: { duration: 0.6, ease: 'easeInOut' } }}
      >
        <ConcealedRow row={row} />
      </motion.div>
    );
  }

  const isTopThree = row.rank <= 3;
  const canExpand = !isTopThree;

  const rowBg = isTopThree
    ? 'bg-[rgba(229,9,20,0.05)] border-[rgba(229,9,20,0.15)]'
    : 'border-[rgba(185,185,185,0.06)] hover:bg-[rgba(255,255,255,0.02)]';

  return (
    <motion.div
      initial={animateIn ? { opacity: 0, x: -20 } : false}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4, layout: { duration: 0.6, ease: 'easeInOut' } }}
      layout
    >
      {/* Main row */}
      <div
        className={`flex items-center gap-4 px-4 py-4 border-b ${rowBg} transition-colors ${
          canExpand ? 'cursor-pointer select-none' : ''
        }`}
        onClick={() => canExpand && setExpanded(e => !e)}
      >
        <div className="w-8 flex justify-center">
          <RankDisplay rank={row.rank} />
        </div>
        <div className="w-5 flex justify-center">
          <MovementIndicator movement={row.movement} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-[#F5F5F5] truncate block">
            {row.teamName}
          </span>
          {row.evaluatedRounds.length > 0 && (
            <span className="text-xs text-[#858585]">
              {row.evaluatedRounds.length}/3 rounds scored
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xl font-bold text-[#F5F5F5] rank-number">
              {row.finalScore ?? '—'}
            </span>
            <span className="text-xs text-[#858585] ml-1">/150</span>
          </div>
          {canExpand && (
            expanded
              ? <ChevronUp className="w-4 h-4 text-[#858585] flex-shrink-0" />
              : <ChevronDown className="w-4 h-4 text-[#858585] flex-shrink-0" />
          )}
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="bg-[#0a0a0a] border-b border-[rgba(185,185,185,0.06)] p-4">
              <div className="max-w-4xl mx-auto grid gap-4">
                {/* Team Info */}
                {row.members && row.members.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-[#E50914]" />
                      <span className="text-sm font-medium text-[#F5F5F5]">Team Members</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {row.members.map((m, i) => (
                        <span
                          key={i}
                          className="text-sm px-3 py-1 rounded-full bg-[#190707] border border-[rgba(229,9,20,0.15)] text-[#B9B9B9]"
                        >
                          {m.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Round Scores */}
                {row.roundScores && row.roundScores.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Trophy className="w-4 h-4 text-[#E50914]" />
                      <span className="text-sm font-medium text-[#F5F5F5]">Score Breakdown</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {row.roundScores.map((round) => (
                        <div
                          key={round.roundId}
                          className="card-dark p-3 rounded-lg"
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-semibold text-[#E50914] uppercase tracking-wider">
                              {round.roundName}
                            </span>
                            <span className="text-sm font-bold text-[#F5F5F5]">
                              {round.total ?? '—'}/50
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            {round.criteria.map((c, ci) => (
                              <div key={ci} className="flex justify-between text-xs">
                                <span className="text-[#858585] truncate mr-2">{c.name}</span>
                                <span className="text-[#B9B9B9] font-medium flex-shrink-0">
                                  {c.value ?? '—'}/{c.max}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Overall score */}
                <div className="flex justify-end">
                  <div className="text-right">
                    <span className="text-xs text-[#858585] block">Overall Score</span>
                    <span className="text-2xl font-bold text-[#F5F5F5] rank-number">
                      {row.finalScore ?? '—'}
                      <span className="text-sm text-[#858585] font-normal">/150</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

