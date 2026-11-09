// src/app/page.tsx
'use client';

import { PublicHeader } from '@/components/public/PublicHeader';
import { Leaderboard } from '@/components/public/Leaderboard';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useReveal } from '@/hooks/useReveal';
import { DEFAULT_COMPETITION_ID } from '@/lib/services/leaderboardService';
import { motion, AnimatePresence } from 'framer-motion';
import { Play } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AuroraBackground } from '@/components/ui/aurora-background';

export default function HomePage() {
  const { leaderboard, loading } = useLeaderboard(DEFAULT_COMPETITION_ID);
  const { revealState } = useReveal(DEFAULT_COMPETITION_ID);

  const isRevealing = revealState?.status === 'revealing' || revealState?.status === 'revealed';

  return (
    <main className="isolate min-h-screen bg-[#090909]">
      <AuroraBackground />

      <PublicHeader leaderboard={leaderboard} />

      {/* Reveal banner */}
      <AnimatePresence>
        {isRevealing && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gradient-to-r from-[#190707] via-[#250A0A] to-[#190707] border-b border-[rgba(229,9,20,0.4)] py-3 px-4"
          >
            <div className="container mx-auto max-w-6xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E50914] opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#E50914]" />
                </span>
                <span className="text-[#E50914] font-semibold">
                  🏆 Winner Reveal is Live!
                </span>
              </div>
              <Link href="/reveal">
                <Button
                  size="sm"
                  className="bg-[#E50914] hover:bg-[#FF3028] text-white glow-red-sm flex items-center gap-2"
                >
                  <Play className="w-3 h-3" />
                  Watch Reveal
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Leaderboard leaderboard={leaderboard} loading={loading} />
      </div>
    </main>
  );
}
