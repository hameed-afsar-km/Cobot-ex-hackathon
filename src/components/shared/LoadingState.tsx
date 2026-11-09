// src/components/shared/LoadingState.tsx
'use client';

import { motion } from 'framer-motion';

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingState({ message = 'Loading...', size = 'md' }: LoadingStateProps) {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <motion.div
        className={`${sizeClasses[size]} border-2 border-[#111111] border-t-[#E50914] rounded-full`}
        animate={{ rotate: 360 }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
      />
      <p className="text-[#858585] text-sm animate-pulse">{message}</p>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-[rgba(185,185,185,0.08)] animate-pulse">
      <div className="w-8 h-5 bg-[#1a1a1a] rounded" />
      <div className="w-5 h-5 bg-[#1a1a1a] rounded" />
      <div className="flex-1 h-5 bg-[#1a1a1a] rounded" />
      <div className="w-16 h-5 bg-[#1a1a1a] rounded" />
    </div>
  );
}

export function LeaderboardSkeleton() {
  return (
    <div className="card-dark overflow-hidden">
      {Array.from({ length: 8 }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

