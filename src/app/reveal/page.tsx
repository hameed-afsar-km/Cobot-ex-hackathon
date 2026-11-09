// src/app/reveal/page.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { useReveal } from '@/hooks/useReveal';
import { DEFAULT_COMPETITION_ID } from '@/lib/services/leaderboardService';
import type { RevealStage, RevealTopThree } from '@/types/leaderboard';
import { Trophy, Medal, Award } from 'lucide-react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

// Confetti particle
function ConfettiParticle({ delay }: { delay: number }) {
  const colors = ['#E50914', '#FF3028', '#FFD700', '#FF6B6B', '#FFA07A', '#FF4500'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const x = Math.random() * 100;
  const rotation = Math.random() * 720 - 360;
  const size = Math.random() * 8 + 4;

  return (
    <motion.div
      className="fixed pointer-events-none"
      style={{
        left: `${x}%`,
        top: -20,
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
      }}
      initial={{ y: -20, opacity: 1, rotate: 0 }}
      animate={{
        y: window.innerHeight + 50,
        opacity: [1, 1, 0],
        rotate: rotation,
        x: [0, (Math.random() - 0.5) * 200],
      }}
      transition={{
        duration: Math.random() * 3 + 2,
        delay,
        ease: 'linear',
      }}
    />
  );
}

function Confetti({ active }: { active: boolean }) {
  const [particles, setParticles] = useState<number[]>([]);

  useEffect(() => {
    if (!active) return;
    const ids = Array.from({ length: 150 }, (_, i) => i);
    setParticles(ids);
  }, [active]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map(id => (
        <ConfettiParticle key={id} delay={id * 0.02} />
      ))}
    </div>
  );
}

function PodiumPosition({
  position,
  team,
  revealed,
  delay,
}: {
  position: 1 | 2 | 3;
  team: { teamName: string; finalScore: number } | null;
  revealed: boolean;
  delay: number;
}) {
  const heights = { 1: 'h-32', 2: 'h-24', 3: 'h-20' };
  const icons = { 1: Trophy, 2: Medal, 3: Award };
  const colors = {
    1: { bg: 'bg-gradient-to-b from-[#2a2000] to-[#1a1200]', border: 'border-[#FFD700]', text: 'rank-gold', glow: '0 0 30px rgba(255,215,0,0.4)' },
    2: { bg: 'bg-gradient-to-b from-[#1a1a1a] to-[#111]', border: 'border-[#C0C0C0]', text: 'rank-silver', glow: '0 0 20px rgba(192,192,192,0.3)' },
    3: { bg: 'bg-gradient-to-b from-[#1a1000] to-[#110900]', border: 'border-[#CD7F32]', text: 'rank-bronze', glow: '0 0 20px rgba(205,127,50,0.3)' },
  };
  const ordinals = { 1: '1st', 2: '2nd', 3: '3rd' };
  const Icon = icons[position];
  const style = colors[position];

  return (
    <motion.div
      className="flex flex-col items-center"
      initial={{ opacity: 0, y: 50 }}
      animate={revealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ delay, duration: 0.6, ease: 'easeOut' }}
    >
      {/* Team info above podium */}
      <AnimatePresence>
        {revealed && team && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: delay + 0.3, duration: 0.5 }}
            className="text-center mb-4 px-4"
          >
            <Icon className={`w-8 h-8 mx-auto mb-2 ${style.text}`} />
            <h3 className={`text-lg md:text-xl font-bold text-[#F5F5F5] mb-1 ${position === 1 ? 'text-2xl md:text-3xl' : ''}`}>
              {team.teamName}
            </h3>
            <p className={`text-2xl font-bold rank-number ${style.text}`}>
              {team.finalScore}
              <span className="text-sm font-normal text-[#858585]">/150</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Podium block */}
      <div
        className={`${heights[position]} w-28 md:w-36 ${style.bg} border-t-2 ${style.border} flex items-start justify-center pt-3 rounded-t-sm`}
        style={{ boxShadow: style.glow }}
      >
        <span className={`text-3xl font-black rank-number ${style.text}`}>
          {ordinals[position]}
        </span>
      </div>
    </motion.div>
  );
}

function ShuffleAnimation({
  topThree,
  active,
  onComplete,
}: {
  topThree: RevealTopThree;
  active: boolean;
  onComplete: () => void;
}) {
  const names = [topThree.first.teamName, topThree.second.teamName, topThree.third.teamName];
  const extendedNames = [...names, ...names, ...names, ...names, ...names];
  const controls = useAnimation();

  useEffect(() => {
    if (!active) return;

    const runShuffle = async () => {
      // Shuffle left-right rapidly then slow to stop
      await controls.start({
        x: [-10, 20, -30, 40, -20, 30, -40, 15, -15, 5, 0],
        transition: {
          duration: 7,
          times: [0, 0.1, 0.2, 0.3, 0.4, 0.55, 0.65, 0.75, 0.85, 0.95, 1],
          ease: 'easeInOut',
        },
      });
      onComplete();
    };

    runShuffle();
  }, [active, controls, onComplete]);

  if (!active) return null;

  return (
    <div className="overflow-hidden w-full max-w-2xl mx-auto">
      <motion.div
        animate={controls}
        className="flex gap-6 justify-center flex-wrap"
      >
        {names.map((name, i) => (
          <motion.div
            key={i}
            className="px-6 py-3 rounded-lg bg-[#190707] border border-[rgba(229,9,20,0.4)] text-[#F5F5F5] font-bold text-lg whitespace-nowrap"
            animate={{
              borderColor: ['rgba(229,9,20,0.4)', 'rgba(255,48,40,0.8)', 'rgba(229,9,20,0.4)'],
            }}
            transition={{
              duration: 0.5,
              repeat: Infinity,
              delay: i * 0.15,
            }}
          >
            {name}
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

export default function RevealPage() {
  const { revealState, currentStage, loading } = useReveal(DEFAULT_COMPETITION_ID);
  const [localStage, setLocalStage] = useState<RevealStage>('idle');
  const [shuffleDone, setShuffleDone] = useState(false);

  useEffect(() => {
    setLocalStage(currentStage);
  }, [currentStage]);

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
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-6">
        <div className="text-center">
          <Trophy className="w-16 h-16 text-[#E50914] mx-auto mb-4 opacity-50" />
          <h1 className="text-3xl font-bold text-[#F5F5F5] mb-2">Winner Reveal</h1>
          <p className="text-[#858585]">The reveal has not started yet. Stay tuned!</p>
        </div>
        <Link href="/" className="flex items-center gap-2 text-[#858585] hover:text-[#E50914] transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" />
          Back to Leaderboard
        </Link>
      </div>
    );
  }

  const topThree = revealState.topThree;
  const isNamePhase = ['third_name', 'second_name', 'first_name', 'shuffle'].includes(localStage);
  const isFinalPhase = ['final_third', 'final_second', 'final_first', 'celebration'].includes(localStage);
  const isCelebration = localStage === 'celebration';

  const thirdRevealed = ['second_name', 'first_name', 'shuffle', 'final_third', 'final_second', 'final_first', 'celebration'].includes(localStage);
  const secondRevealed = ['first_name', 'shuffle', 'final_second', 'final_first', 'celebration'].includes(localStage);
  const firstRevealed = ['shuffle', 'final_first', 'celebration'].includes(localStage);

  const podiumThirdRevealed = ['final_third', 'final_second', 'final_first', 'celebration'].includes(localStage);
  const podiumSecondRevealed = ['final_second', 'final_first', 'celebration'].includes(localStage);
  const podiumFirstRevealed = ['final_first', 'celebration'].includes(localStage);

  return (
    <main className="min-h-screen bg-[#050505] relative overflow-hidden flex flex-col items-center justify-center">
      {/* Atmospheric background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-reveal-gradient" />
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

      <div className="relative z-10 container mx-auto px-4 py-12 max-w-4xl">

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-6xl font-black text-[#F5F5F5] tracking-tight glow-red-text mb-2">
            WINNER REVEAL
          </h1>
          <div className="h-0.5 w-32 bg-gradient-to-r from-transparent via-[#E50914] to-transparent mx-auto" />
        </motion.div>

        {/* STAGE 1–2: Name reveals + shuffle */}
        <AnimatePresence mode="wait">
          {isNamePhase && topThree && (
            <motion.div
              key="name-phase"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center space-y-8"
            >
              {/* Third place name */}
              <AnimatePresence>
                {thirdRevealed && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5, filter: 'blur(20px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="space-y-1"
                  >
                    <p className="text-[#CD7F32] text-sm uppercase tracking-widest font-semibold">3rd Place</p>
                    <p className="text-3xl md:text-4xl font-black text-[#F5F5F5]">
                      {topThree.third.teamName}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Second place name */}
              <AnimatePresence>
                {secondRevealed && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5, filter: 'blur(20px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="space-y-1"
                  >
                    <p className="text-[#C0C0C0] text-sm uppercase tracking-widest font-semibold">2nd Place</p>
                    <p className="text-3xl md:text-5xl font-black text-[#F5F5F5]">
                      {topThree.second.teamName}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* First place name */}
              <AnimatePresence>
                {firstRevealed && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.3, filter: 'blur(30px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                    className="space-y-1"
                  >
                    <p className="text-[#FFD700] text-sm uppercase tracking-widest font-semibold">🏆 Champion</p>
                    <p className="text-5xl md:text-6xl font-black text-[#F5F5F5] glow-red-text">
                      {topThree.first.teamName}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Shuffle */}
              {localStage === 'shuffle' && topThree && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="pt-8"
                >
                  <p className="text-[#858585] text-sm mb-6 uppercase tracking-wider">Finalizing Rankings...</p>
                  <ShuffleAnimation
                    topThree={topThree}
                    active={localStage === 'shuffle'}
                    onComplete={() => setShuffleDone(true)}
                  />
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* STAGE 3–4: Podium + celebration */}
        <AnimatePresence>
          {isFinalPhase && topThree && (
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
                  <p className="text-6xl mb-2">🎉</p>
                  <h2 className="text-3xl md:text-4xl font-black text-[#FFD700] glow-red-text">
                    CONGRATULATIONS!
                  </h2>
                  <p className="text-[#858585] mt-2">Competition Complete</p>
                </motion.div>
              )}

              {/* Podium */}
              <div className="flex items-end justify-center gap-4 md:gap-8 mt-8">
                <PodiumPosition
                  position={2}
                  team={podiumSecondRevealed ? topThree.second : null}
                  revealed={podiumSecondRevealed}
                  delay={0}
                />
                <PodiumPosition
                  position={1}
                  team={podiumFirstRevealed ? topThree.first : null}
                  revealed={podiumFirstRevealed}
                  delay={0.4}
                />
                <PodiumPosition
                  position={3}
                  team={podiumThirdRevealed ? topThree.third : null}
                  revealed={podiumThirdRevealed}
                  delay={0}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

