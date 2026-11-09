// src/app/reveal/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReveal } from '@/hooks/useReveal';
import { DEFAULT_COMPETITION_ID } from '@/lib/services/leaderboardService';
import type { RevealStage } from '@/types/leaderboard';
import { Trophy, Medal, Award, Lock, Users, Crown, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { AuroraBackground } from '@/components/ui/aurora-background';

// Deterministic pseudo-random so particle props stay pure across renders.
function rand(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

// Confetti particle
function ConfettiParticle({ id, delay }: { id: number; delay: number }) {
  const colors = ['#E50914', '#FF3028', '#FFD700', '#FF6B6B', '#FFA07A', '#FF4500'];
  const color = colors[Math.floor(rand(id + 1) * colors.length)];
  const x = rand(id + 2) * 100;
  const rotation = rand(id + 3) * 720 - 360;
  const size = rand(id + 4) * 8 + 4;

  return (
    <motion.div
      className="fixed pointer-events-none"
      style={{
        left: `${x}%`,
        top: -20,
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: rand(id + 5) > 0.5 ? '50%' : '2px',
      }}
      initial={{ y: -20, opacity: 1, rotate: 0 }}
      animate={{
        y: window.innerHeight + 50,
        opacity: [1, 1, 0],
        rotate: rotation,
        x: [0, (rand(id + 6) - 0.5) * 200],
      }}
      transition={{
        duration: rand(id + 7) * 3 + 2,
        delay,
        ease: 'linear',
      }}
    />
  );
}

function Confetti({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {Array.from({ length: 150 }, (_, id) => (
        <ConfettiParticle key={id} id={id} delay={id * 0.02} />
      ))}
    </div>
  );
}

function ContenderRow({
  team,
  nameVisible,
}: {
  team: { teamName: string; finalScore: number };
  nameVisible: boolean;
}) {
  return (
    <motion.div
      layout
      transition={{ layout: { duration: 0.45, ease: 'easeInOut' } }}
      className="relative flex items-center gap-4 rounded-xl border border-[rgba(185,185,185,0.12)] bg-[rgba(255,255,255,0.018)] p-4 md:p-5"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[rgba(185,185,185,0.12)] bg-[#0d0d0d]">
        <Users className="h-4 w-4 text-[#858585]" />
      </span>

      <motion.p
        initial={{ filter: 'blur(10px)', opacity: 0.55 }}
        animate={
          nameVisible
            ? { filter: 'blur(0px)', opacity: 1 }
            : { filter: 'blur(10px)', opacity: 0.55 }
        }
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="min-w-0 flex-1 truncate text-xl font-black text-[#F5F5F5] md:text-2xl"
      >
        {team.teamName}
      </motion.p>

      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#5f5f5f]">
        Finalist
      </span>
    </motion.div>
  );
}

const PODIUM_STYLES = {
  1: {
    label: '1st Place',
    caption: 'Champion',
    icon: Crown,
    accentRgb: '255,215,0',
    text: 'rank-gold',
    card:
      'linear-gradient(180deg, rgba(255,215,0,0.16) 0%, rgba(255,215,0,0.03) 38%, rgba(12,7,7,0.96) 100%)',
    border: 'rgba(255,215,0,0.45)',
    glow: '0 0 60px rgba(255,215,0,0.20), 0 0 120px rgba(229,9,20,0.08)',
    pedestal:
      'linear-gradient(180deg, rgba(255,215,0,0.22) 0%, rgba(60,20,8,0.60) 45%, rgba(10,6,6,0.98) 100%)',
    cardHeight: 'min-h-[15rem] md:min-h-[17rem]',
    pedestalHeight: 'h-28 md:h-32',
    order: 'order-1 md:order-2',
  },
  2: {
    label: '2nd Place',
    caption: 'Runner-up',
    icon: Medal,
    accentRgb: '201,201,201',
    text: 'rank-silver',
    card:
      'linear-gradient(180deg, rgba(201,201,201,0.10) 0%, rgba(201,201,201,0.02) 38%, rgba(12,7,7,0.96) 100%)',
    border: 'rgba(201,201,201,0.32)',
    glow: '0 0 45px rgba(201,201,201,0.12)',
    pedestal:
      'linear-gradient(180deg, rgba(201,201,201,0.16) 0%, rgba(40,40,40,0.50) 45%, rgba(10,6,6,0.98) 100%)',
    cardHeight: 'min-h-[13rem] md:min-h-[15rem]',
    pedestalHeight: 'h-20 md:h-24',
    order: 'order-2 md:order-1',
  },
  3: {
    label: '3rd Place',
    caption: 'Third Place',
    icon: Award,
    accentRgb: '205,127,50',
    text: 'rank-bronze',
    card:
      'linear-gradient(180deg, rgba(205,127,50,0.11) 0%, rgba(205,127,50,0.02) 38%, rgba(12,7,7,0.96) 100%)',
    border: 'rgba(205,127,50,0.34)',
    glow: '0 0 40px rgba(205,127,50,0.12)',
    pedestal:
      'linear-gradient(180deg, rgba(205,127,50,0.18) 0%, rgba(50,25,10,0.50) 45%, rgba(10,6,6,0.98) 100%)',
    cardHeight: 'min-h-[11rem] md:min-h-[13rem]',
    pedestalHeight: 'h-16 md:h-20',
    order: 'order-3 md:order-3',
  },
} as const;

function PodiumCard({
  position,
  team,
  revealed,
}: {
  position: 1 | 2 | 3;
  team: { teamName: string; finalScore: number } | null;
  revealed: boolean;
}) {
  const style = PODIUM_STYLES[position];
  const Icon = style.icon;

  return (
    <div className={`relative flex min-w-0 w-full flex-col justify-end ${style.order} md:flex-1`}>
      <motion.div
        className="relative overflow-hidden rounded-t-2xl border px-4 pb-6 pt-7 text-center md:px-5"
        style={{
          background: revealed ? style.card : 'rgba(255,255,255,0.015)',
          borderColor: revealed ? style.border : 'rgba(185,185,185,0.10)',
          boxShadow: revealed ? style.glow : 'none',
        }}
        animate={{
          opacity: revealed ? 1 : 0.55,
          filter: revealed ? 'blur(0px)' : 'blur(2px)',
        }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      >
        <span
          className="pointer-events-none absolute -right-1 -top-6 select-none text-[7rem] font-black leading-none text-white/[0.035] md:text-[8rem]"
          aria-hidden
        >
          {revealed ? position : '?'}
        </span>

        <div className={`relative flex flex-col ${style.cardHeight}`}>
          {revealed && team ? (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.08, duration: 0.5, ease: 'easeOut' }}
              className="flex w-full flex-1 flex-col items-center justify-end"
            >
              <div
                className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border"
                style={{
                  borderColor: `rgba(${style.accentRgb},0.45)`,
                  background: `radial-gradient(circle at 50% 30%, rgba(${style.accentRgb},0.22), rgba(10,6,6,0.85))`,
                  boxShadow: `0 0 24px rgba(${style.accentRgb},0.18)`,
                }}
              >
                <Icon className={`h-6 w-6 ${style.text}`} />
              </div>

              <p className={`text-[10px] font-bold uppercase tracking-[0.32em] ${style.text}`}>
                {style.label}
              </p>
              <p className="mt-1 text-[9px] uppercase tracking-[0.28em] text-[#7a7a7a]">
                {style.caption}
              </p>

              <h3
                className={`mt-4 w-full text-lg font-black leading-tight text-[#F5F5F5] [text-wrap:balance] md:text-xl ${
                  position === 1 ? 'md:text-2xl' : ''
                }`}
              >
                {team.teamName}
              </h3>

              <div className="mt-auto w-full pt-5">
                <div
                  className="mx-auto mb-3 h-px w-14"
                  style={{
                    background: `linear-gradient(90deg, transparent, rgba(${style.accentRgb},0.6), transparent)`,
                  }}
                />
                <p className="text-[9px] uppercase tracking-[0.28em] text-[#7a7a7a]">
                  Overall Score
                </p>
                <p className={`rank-number mt-1 text-4xl font-black md:text-5xl ${style.text}`}>
                  {team.finalScore}
                  <span className="ml-1 text-xs font-normal text-[#858585]">/150</span>
                </p>
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.02]">
                <Lock className="h-5 w-5 text-[#5f5f5f]" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-[0.28em] text-[#5f5f5f]">Awaiting</p>
                <p className="text-[9px] uppercase tracking-[0.24em] text-[#454545]">Reveal</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <motion.div
        className={`relative flex ${style.pedestalHeight} items-center justify-center overflow-hidden rounded-b-lg border-x border-b`}
        style={{
          background: revealed
            ? style.pedestal
            : 'linear-gradient(180deg, rgba(255,255,255,0.025), rgba(8,5,5,0.98))',
          borderColor: revealed ? `rgba(${style.accentRgb},0.28)` : 'rgba(185,185,185,0.08)',
        }}
        animate={{ opacity: revealed ? 1 : 0.6 }}
        transition={{ duration: 0.5 }}
      >
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, rgba(${style.accentRgb},0.5), transparent)`,
          }}
        />
        <motion.span
          className={`rank-number text-4xl font-black md:text-6xl ${
            revealed ? style.text : 'text-[#2f2f2f]'
          }`}
          animate={{ opacity: revealed ? 0.9 : 0.5, scale: revealed ? 1 : 0.86 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {revealed ? position : '?'}
        </motion.span>
        <span className="absolute bottom-2 text-[8px] uppercase tracking-[0.3em] text-[#5f5f5f]">
          {revealed ? 'Place' : 'TBD'}
        </span>
      </motion.div>
    </div>
  );
}

const NAME_PHASES: RevealStage[] = ['third_name', 'second_name', 'first_name', 'shuffle'];
const FINAL_PHASES: RevealStage[] = ['final_third', 'final_second', 'final_first', 'celebration'];

const STAGE_LABELS: Partial<Record<RevealStage, string>> = {
  third_name: 'Revealing Finalists',
  second_name: 'Revealing Finalists',
  first_name: 'Finalists Revealed',
  shuffle: 'Shuffling Finalists',
  reblur: 'Locking Finalists',
  final_third: '3rd Place',
  final_second: '2nd Place',
  final_first: 'Champion',
  celebration: 'Competition Complete',
};

export default function RevealPage() {
  const { revealState, currentStage, loading } = useReveal(DEFAULT_COMPETITION_ID);
  const [order, setOrder] = useState<number[]>([3, 2, 1]);

  const topThree = revealState?.topThree;

  const contenders = useMemo(
    () =>
      topThree
        ? ([3, 2, 1] as const).map(position => ({
            position,
            team:
              position === 1
                ? topThree.first
                : position === 2
                  ? topThree.second
                  : topThree.third,
          }))
        : [],
    [topThree]
  );

  // Neutral order before the shuffle so the list never implies a ranking.
  const neutralOrder = useMemo(
    () =>
      [...contenders]
        .sort((a, b) => a.team.teamName.localeCompare(b.team.teamName))
        .map(contender => contender.position),
    [contenders]
  );

  // Keep the three contenders shuffling while the admin-broadcasted reveal is
  // in its shuffle phase.
  useEffect(() => {
    if (currentStage !== 'shuffle') return;

    const shuffle = () => {
      setOrder(previous => {
        const next = [...previous];
        for (let i = next.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1));
          [next[i], next[j]] = [next[j], next[i]];
        }
        return next.every((value, index) => value === previous[index])
          ? [...previous].reverse()
          : next;
      });
    };

    shuffle();
    const interval = window.setInterval(shuffle, 700);

    return () => window.clearInterval(interval);
  }, [currentStage]);

  const displayOrder =
    currentStage === 'shuffle' || currentStage === 'reblur' ? order : neutralOrder;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#111] border-t-[#E50914] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#858585]">Connecting to reveal...</p>
        </div>
      </div>
    );
  }

  if (!revealState || revealState.status === 'concealed') {
    return (
      <div className="relative isolate min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-6 overflow-hidden">
        <AuroraBackground />
        <div className="relative z-10 text-center">
          <Trophy className="w-16 h-16 text-[#E50914] mx-auto mb-4 opacity-50" />
          <h1 className="text-3xl font-bold text-[#F5F5F5] mb-2">Winner Reveal</h1>
          <p className="text-[#858585]">The reveal has not started yet. Stay tuned!</p>
        </div>
        <Link href="/" className="relative z-10 flex items-center gap-2 text-[#858585] hover:text-[#E50914] transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" />
          Back to Leaderboard
        </Link>
      </div>
    );
  }

  if (!topThree) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <p className="text-[#858585]">Preparing the final standings...</p>
      </div>
    );
  }

  const isNamePhase = NAME_PHASES.includes(currentStage);
  const isReblur = currentStage === 'reblur';
  const isFinalPhase = FINAL_PHASES.includes(currentStage);
  const isCelebration = currentStage === 'celebration';

  // Name reveals are cumulative: 3rd, then 2nd, then 1st.
  const thirdNameVisible = ['third_name', 'second_name', 'first_name', 'shuffle'].includes(currentStage);
  const secondNameVisible = ['second_name', 'first_name', 'shuffle'].includes(currentStage);
  const firstNameVisible = ['first_name', 'shuffle'].includes(currentStage);

  const podiumThirdRevealed = ['final_third', 'final_second', 'final_first', 'celebration'].includes(currentStage);
  const podiumSecondRevealed = ['final_second', 'final_first', 'celebration'].includes(currentStage);
  const podiumFirstRevealed = ['final_first', 'celebration'].includes(currentStage);

  const contenderPositionByName: Record<number, boolean> = {
    1: firstNameVisible,
    2: secondNameVisible,
    3: thirdNameVisible,
  };

  const stageLabel = STAGE_LABELS[currentStage] ?? 'Winner Reveal';

  return (
    <main className="min-h-screen bg-[#050505] relative isolate overflow-hidden flex flex-col items-center justify-center">
      <AuroraBackground />

      {/* Atmospheric background */}
      <div className="fixed inset-0 pointer-events-none opacity-50">
        <motion.div
          className="absolute inset-0"
          animate={isCelebration ? {
            background: [
              'radial-gradient(ellipse at 50% 50%, rgba(229,9,20,0.15) 0%, transparent 70%)',
              'radial-gradient(ellipse at 50% 50%, rgba(229,9,20,0.3) 0%, transparent 70%)',
              'radial-gradient(ellipse at 50% 50%, rgba(229,9,20,0.15) 0%, transparent 70%)',
            ]
          } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>

      {/* Confetti */}
      <Confetti active={isCelebration} />

      {/* Back link */}
      <Link
        href="/"
        className="fixed top-4 left-4 flex items-center gap-2 text-[#858585] hover:text-[#E50914] transition-colors text-sm z-40"
      >
        <ArrowLeft className="w-4 h-4" />
        Leaderboard
      </Link>

      <div className="relative z-10 container mx-auto px-4 py-12 max-w-5xl">

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-4xl md:text-6xl font-black text-[#F5F5F5] tracking-tight glow-red-text mb-2">
            WINNER REVEAL
          </h1>
          <div className="h-0.5 w-32 bg-gradient-to-r from-transparent via-[#E50914] to-transparent mx-auto" />
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[rgba(229,9,20,0.3)] bg-[rgba(229,9,20,0.06)] px-4 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E50914] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E50914]" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-widest text-[#E50914]" aria-live="polite">
              {stageLabel}
            </span>
          </div>
        </motion.div>

        {/* STAGE 1â€“3: Sequential name reveals, shuffle, full re-blur */}
        <AnimatePresence mode="wait">
          {(isNamePhase || isReblur) && (
            <motion.div
              key="contender-phase"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="mx-auto max-w-xl space-y-3"
            >
              <motion.p
                key={currentStage}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 text-center text-sm uppercase tracking-[0.25em] text-[#858585]"
              >
                {isReblur ? 'Stand by...' : 'Finalists'}
              </motion.p>

              {displayOrder.map(position => {
                const contender = contenders.find(item => item.position === position);
                if (!contender) return null;

                return (
                  <ContenderRow
                    key={contender.position}
                    team={contender.team}
                    nameVisible={!isReblur && contenderPositionByName[contender.position]}
                  />
                );
              })}

              <motion.p
                animate={{ opacity: isReblur ? [0.35, 0.7, 0.35] : 0.7 }}
                transition={{ duration: 1.6, repeat: isReblur ? Infinity : 0 }}
                className="pt-4 text-center text-xs uppercase tracking-[0.2em] text-[#858585]"
              >
                {isReblur
                  ? 'Locking in final standings'
                  : currentStage === 'shuffle'
                    ? 'Determining final order'
                    : 'Positions and scores revealed at the podium'}
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* STAGE 4â€“5: Podium + celebration */}
        <AnimatePresence>
          {isFinalPhase && (
            <motion.div
              key="podium-phase"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              {isCelebration && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6 }}
                  className="mb-8"
                >
                  <p className="text-6xl mb-2">ðŸŽ‰</p>
                  <h2 className="text-3xl md:text-4xl font-black text-[#FFD700] glow-red-text">
                    CONGRATULATIONS!
                  </h2>
                  <p className="text-[#858585] mt-2">Competition Complete</p>
                </motion.div>
              )}

              {/* Podium */}
              <div className="relative mx-auto mt-10 max-w-5xl">
                <div className="mb-6 flex items-center justify-center gap-4">
                  <span className="h-px w-12 bg-gradient-to-r from-transparent to-[rgba(229,9,20,0.6)]" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#858585]">
                    Final Podium
                  </p>
                  <span className="h-px w-12 bg-gradient-to-l from-transparent to-[rgba(229,9,20,0.6)]" />
                </div>

                <div className="relative">
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[rgba(229,9,20,0.55)] to-transparent" />
                  <div className="pointer-events-none absolute inset-x-10 bottom-0 h-40 bg-[radial-gradient(ellipse_at_50%_100%,rgba(229,9,20,0.18),transparent_70%)]" />

                  <div className="relative flex flex-col items-stretch justify-center gap-4 md:flex-row md:items-end md:gap-5">
                    <PodiumCard
                      position={2}
                      team={podiumSecondRevealed ? topThree.second : null}
                      revealed={podiumSecondRevealed}
                    />
                    <PodiumCard
                      position={1}
                      team={podiumFirstRevealed ? topThree.first : null}
                      revealed={podiumFirstRevealed}
                    />
                    <PodiumCard
                      position={3}
                      team={podiumThirdRevealed ? topThree.third : null}
                      revealed={podiumThirdRevealed}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
