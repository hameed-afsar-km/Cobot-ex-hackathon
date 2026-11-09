// src/app/reveal/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReveal } from '@/hooks/useReveal';
import { useCompetition } from '@/hooks/useCompetition';
import { DEFAULT_COMPETITION_ID } from '@/lib/services/leaderboardService';
import { getCompetitionMaxScore, MAX_FINAL_SCORE } from '@/lib/utils/scoring';
import type { RevealStage } from '@/types/leaderboard';
import { Trophy, Medal, Award, Lock, Users, Crown, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { AuroraBackground } from '@/components/ui/aurora-background';

// Deterministic pseudo-random so particle props stay pure across renders.
function rand(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

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

function ContenderCard({
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
      className="relative flex items-center gap-3 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] px-3 py-3 backdrop-blur-md sm:gap-4 sm:px-5 sm:py-4"
    >
      <span className="absolute inset-y-3 left-0 w-px bg-gradient-to-b from-transparent via-[#E50914]/70 to-transparent" />

      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-[#0d0d0d] sm:h-11 sm:w-11">
        <Users className="h-3.5 w-3.5 text-[#858585] sm:h-4 sm:w-4" />
      </span>

      <motion.p
        initial={{ filter: 'blur(10px)', opacity: 0.55 }}
        animate={
          nameVisible
            ? { filter: 'blur(0px)', opacity: 1 }
            : { filter: 'blur(10px)', opacity: 0.55 }
        }
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="min-w-0 flex-1 truncate text-lg font-black text-[#F5F5F5] sm:text-xl md:text-2xl"
      >
        {team.teamName}
      </motion.p>

      <span className="shrink-0 rounded-full border border-white/[0.07] bg-white/[0.02] px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.2em] text-[#6b6b6b] sm:px-2.5 sm:text-[9px]">
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
    surface:
      'linear-gradient(180deg, rgba(255,215,0,0.18) 0%, rgba(56,39,6,0.34) 42%, rgba(7,6,5,0.98) 100%)',
    border: 'rgba(255,215,0,0.52)',
    glow: '0 -20px 90px rgba(255,215,0,0.18), 0 30px 120px rgba(229,9,20,0.12)',
    height: 'h-[16rem] sm:h-[20rem] md:h-[24rem]',
  },
  2: {
    label: '2nd Place',
    caption: 'Runner-up',
    icon: Medal,
    accentRgb: '201,201,201',
    text: 'rank-silver',
    surface:
      'linear-gradient(180deg, rgba(201,201,201,0.13) 0%, rgba(40,40,40,0.28) 42%, rgba(7,6,5,0.98) 100%)',
    border: 'rgba(201,201,201,0.36)',
    glow: '0 -16px 70px rgba(201,201,201,0.12)',
    height: 'h-[13rem] sm:h-[17rem] md:h-[20rem]',
  },
  3: {
    label: '3rd Place',
    caption: 'Third Place',
    icon: Award,
    accentRgb: '205,127,50',
    text: 'rank-bronze',
    surface:
      'linear-gradient(180deg, rgba(205,127,50,0.15) 0%, rgba(45,24,10,0.3) 42%, rgba(7,6,5,0.98) 100%)',
    border: 'rgba(205,127,50,0.4)',
    glow: '0 -14px 65px rgba(205,127,50,0.12)',
    height: 'h-[11rem] sm:h-[15rem] md:h-[18rem]',
  },
} as const;

function PodiumColumn({
  position,
  team,
  revealed,
  maxFinalScore,
}: {
  position: 1 | 2 | 3;
  team: { teamName: string; finalScore: number } | null;
  revealed: boolean;
  maxFinalScore: number;
}) {
  const style = PODIUM_STYLES[position];
  const Icon = style.icon;

  return (
    <motion.div
      className={`relative flex w-full max-w-[14rem] flex-1 basis-0 flex-col items-center justify-between overflow-hidden rounded-t-[1.75rem] border px-2 pb-4 pt-5 text-center sm:rounded-t-[2rem] sm:px-4 sm:pb-6 sm:pt-7 md:px-5 ${style.height}`}
      style={{
        background: revealed
          ? style.surface
          : 'linear-gradient(180deg, rgba(255,255,255,0.035), rgba(5,5,5,0.96))',
        borderColor: revealed ? style.border : 'rgba(255,255,255,0.08)',
        boxShadow: revealed ? style.glow : 'none',
      }}
      animate={{
        opacity: revealed ? 1 : 0.55,
        filter: revealed ? 'blur(0px)' : 'blur(1.5px)',
      }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
    >
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: revealed
            ? `linear-gradient(90deg, transparent, rgba(${style.accentRgb},0.7), transparent)`
            : 'rgba(255,255,255,0.08)',
        }}
      />

      <div className="relative flex w-full flex-col items-center">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full border sm:h-11 sm:w-11"
          style={{
            borderColor: revealed
              ? `rgba(${style.accentRgb},0.45)`
              : 'rgba(255,255,255,0.08)',
            background: revealed
              ? `radial-gradient(circle at 50% 30%, rgba(${style.accentRgb},0.22), rgba(8,6,5,0.9))`
              : 'rgba(255,255,255,0.02)',
          }}
        >
          <Icon
            className={`h-4 w-4 sm:h-5 sm:w-5 ${
              revealed ? style.text : 'text-[#555]'
            }`}
          />
        </div>

        <p
          className={`mt-2 text-[8px] font-bold uppercase tracking-[0.22em] sm:text-[9px] ${
            revealed ? style.text : 'text-[#555]'
          }`}
        >
          {style.label}
        </p>
        <p className="mt-0.5 text-[7px] uppercase tracking-[0.18em] text-[#666] sm:text-[8px]">
          {style.caption}
        </p>
      </div>

      {revealed && team ? (
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.08, duration: 0.5, ease: 'easeOut' }}
          className="relative flex w-full flex-col items-center"
        >
          <h3
            className={`w-full text-balance text-center text-[11px] font-black leading-tight text-[#F5F5F5] sm:text-base md:text-xl ${
              position === 1 ? 'md:text-2xl' : ''
            }`}
          >
            {team.teamName}
          </h3>

          <div
            className="mx-auto mt-2 h-px w-8 sm:mt-3 sm:w-12"
            style={{
              background: `linear-gradient(90deg, transparent, rgba(${style.accentRgb},0.65), transparent)`,
            }}
          />

          <p className="mt-2 flex items-baseline justify-center sm:mt-3">
            <span
              className={`rank-number text-3xl font-black sm:text-4xl md:text-5xl ${style.text}`}
            >
              {team.finalScore}
            </span>
            <span className="ml-1 text-[8px] font-normal text-[#858585] sm:text-[10px]">
              /{maxFinalScore}
            </span>
          </p>
        </motion.div>
      ) : (
        <div className="relative flex flex-col items-center gap-2">
          <Lock className="h-4 w-4 text-[#555]" />
          <p className="text-[7px] uppercase tracking-[0.18em] text-[#555] sm:text-[8px]">
            Awaiting reveal
          </p>
        </div>
      )}

      <div className="relative flex w-full items-end justify-center">
        <motion.span
          className={`rank-number text-5xl font-black leading-none sm:text-6xl md:text-7xl ${
            revealed ? style.text : 'text-white/[0.06]'
          }`}
          animate={{ opacity: revealed ? 0.95 : 0.65, scale: revealed ? 1 : 0.9 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {revealed ? position : '?'}
        </motion.span>
      </div>
    </motion.div>
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
  const { competition } = useCompetition();
  const maxFinalScore = competition ? getCompetitionMaxScore(competition) : MAX_FINAL_SCORE;
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
      <div className="min-h-[100dvh] bg-[#050505] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#111] border-t-[#E50914] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#858585]">Connecting to reveal...</p>
        </div>
      </div>
    );
  }

  if (!revealState || revealState.status === 'concealed') {
    return (
      <div className="relative isolate flex min-h-[100dvh] flex-col items-center justify-center gap-6 overflow-hidden bg-[#050505]">
        <AuroraBackground />
        <div className="relative z-10 text-center">
          <Trophy className="w-16 h-16 text-[#E50914] mx-auto mb-4 opacity-50" />
          <h1 className="text-3xl font-bold text-[#F5F5F5] mb-2">Winner Reveal</h1>
          <p className="text-[#858585]">The reveal has not started yet. Stay tuned!</p>
        </div>
        <Link
          href="/"
          className="relative z-10 flex items-center gap-2 text-[#858585] hover:text-[#E50914] transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Leaderboard
        </Link>
      </div>
    );
  }

  if (!topThree) {
    return (
      <div className="min-h-[100dvh] bg-[#050505] flex items-center justify-center">
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
    <main className="relative isolate flex h-[100dvh] w-full flex-col overflow-hidden bg-[#050505] text-[#F5F5F5]">
      <AuroraBackground />

      {/* Atmosphere */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(229,9,20,0.18),transparent_58%)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.55) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.55) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
          maskImage: 'radial-gradient(ellipse at center, black, transparent 78%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black, transparent 78%)',
        }}
      />
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-50"
        animate={
          isCelebration
            ? {
                background: [
                  'radial-gradient(ellipse at 50% 65%, rgba(229,9,20,0.10) 0%, transparent 65%)',
                  'radial-gradient(ellipse at 50% 65%, rgba(229,9,20,0.24) 0%, transparent 65%)',
                  'radial-gradient(ellipse at 50% 65%, rgba(229,9,20,0.10) 0%, transparent 65%)',
                ],
              }
            : {}
        }
        transition={{ duration: 2.4, repeat: Infinity }}
      />

      <Confetti active={isCelebration} />

      {/* Top bar */}
      <header className="relative z-30 flex items-center justify-between gap-4 px-4 py-4 sm:px-6 md:px-8">
        <Link
          href="/"
          className="group flex items-center gap-2 text-xs text-[#858585] transition-colors hover:text-[#F5F5F5]"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          <span className="hidden sm:inline">Leaderboard</span>
        </Link>

        <div className="flex items-center gap-2 rounded-full border border-[rgba(229,9,20,0.28)] bg-[rgba(229,9,20,0.06)] px-3 py-1.5 backdrop-blur-md">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E50914] opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#E50914]" />
          </span>
          <span
            className="text-[8px] font-semibold uppercase tracking-[0.2em] text-[#E50914] sm:text-[9px]"
            aria-live="polite"
          >
            {stageLabel}
          </span>
        </div>

        <div className="hidden text-right sm:block">
          <p className="text-[8px] uppercase tracking-[0.28em] text-[#555]">Live reveal</p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#858585]">
            Cobot-ex 2026
          </p>
        </div>
      </header>

      {/* Stage */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-4 pb-6 sm:px-6">
        <AnimatePresence mode="wait">
          {(isNamePhase || isReblur) && (
            <motion.section
              key="name-stage"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="flex w-full max-w-xl flex-col items-center"
            >
              <div className="text-center">
                <p className="text-[9px] uppercase tracking-[0.52em] text-[#E50914]">
                  The reveal
                </p>
                <h1 className="mt-2 text-[clamp(2rem,6vw,4.5rem)] font-black leading-[0.88] tracking-[-0.055em]">
                  {isReblur ? 'Stand by.' : 'Meet the finalists.'}
                </h1>
                <p className="mt-2 text-xs text-[#858585] sm:text-sm">
                  {isReblur
                    ? 'The final standings are being locked.'
                    : 'Names first. Positions and scores arrive on the podium.'}
                </p>
              </div>

              <div className="mt-6 w-full space-y-2.5 sm:mt-8 sm:space-y-3">
                {displayOrder.map(position => {
                  const contender = contenders.find(item => item.position === position);
                  if (!contender) return null;

                  return (
                    <ContenderCard
                      key={contender.position}
                      team={contender.team}
                      nameVisible={!isReblur && contenderPositionByName[contender.position]}
                    />
                  );
                })}
              </div>

              <motion.p
                animate={{ opacity: isReblur ? [0.35, 0.7, 0.35] : 0.65 }}
                transition={{ duration: 1.6, repeat: isReblur ? Infinity : 0 }}
                className="mt-5 text-center text-[8px] uppercase tracking-[0.24em] text-[#666] sm:mt-6 sm:text-[9px]"
              >
                {isReblur
                  ? 'Locking in final standings'
                  : currentStage === 'shuffle'
                    ? 'Determining final order'
                    : 'Positions revealed at the podium'}
              </motion.p>
            </motion.section>
          )}

          {isFinalPhase && (
            <motion.section
              key="podium-stage"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className="flex w-full max-w-5xl flex-col items-center"
            >
              <AnimatePresence mode="wait">
                {isCelebration ? (
                  <motion.div
                    key="celebration-copy"
                    initial={{ opacity: 0, y: 14, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="text-center"
                  >
                    <p className="text-[8px] font-semibold uppercase tracking-[0.5em] text-[#E50914] sm:text-[9px]">
                      The results are in
                    </p>
                    <h1 className="mt-2 bg-[linear-gradient(180deg,#FFF8D6_0%,#FFD700_42%,#E50914_100%)] bg-clip-text text-[clamp(2rem,7vw,5.8rem)] font-black leading-[0.84] tracking-[-0.065em] text-transparent [text-wrap:balance]">
                      CONGRATULATIONS
                    </h1>
                    <p className="mt-2 text-[8px] uppercase tracking-[0.3em] text-[#858585] sm:text-[9px]">
                      Competition complete
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="podium-copy"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="text-center"
                  >
                    <p className="text-[8px] font-semibold uppercase tracking-[0.5em] text-[#E50914] sm:text-[9px]">
                      Final Podium
                    </p>
                    <h1 className="mt-2 text-[clamp(1.8rem,5vw,4.2rem)] font-black leading-[0.9] tracking-[-0.055em] text-[#F5F5F5]">
                      The winners are in.
                    </h1>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative mt-6 w-full sm:mt-8">
                <div className="pointer-events-none absolute -inset-x-8 bottom-0 h-48 bg-[radial-gradient(ellipse_at_50%_100%,rgba(229,9,20,0.22),transparent_70%)] sm:h-56" />

                <div className="relative flex items-end justify-center gap-1.5 sm:gap-3 md:gap-5">
                  <PodiumColumn
                    position={2}
                    team={podiumSecondRevealed ? topThree.second : null}
                    revealed={podiumSecondRevealed}
                    maxFinalScore={maxFinalScore}
                  />
                  <PodiumColumn
                    position={1}
                    team={podiumFirstRevealed ? topThree.first : null}
                    revealed={podiumFirstRevealed}
                    maxFinalScore={maxFinalScore}
                  />
                  <PodiumColumn
                    position={3}
                    team={podiumThirdRevealed ? topThree.third : null}
                    revealed={podiumThirdRevealed}
                    maxFinalScore={maxFinalScore}
                  />
                </div>

                <div className="relative mx-auto h-px w-full max-w-4xl bg-gradient-to-r from-transparent via-[rgba(229,9,20,0.55)] to-transparent" />
                <div className="relative mx-auto mt-3 flex max-w-4xl items-center justify-center gap-3 text-[7px] uppercase tracking-[0.3em] text-[#555] sm:text-[8px]">
                  <span className="h-px w-8 bg-white/10" />
                  <span>Cobot-ex Championship</span>
                  <span className="h-px w-8 bg-white/10" />
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
