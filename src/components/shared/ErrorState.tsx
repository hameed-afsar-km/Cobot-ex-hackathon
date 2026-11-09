// src/components/shared/ErrorState.tsx
'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
      <div className="w-16 h-16 rounded-full bg-[#250A0A] border border-[rgba(229,9,20,0.3)] flex items-center justify-center">
        <AlertTriangle className="w-7 h-7 text-[#E50914]" />
      </div>
      <div>
        <h3 className="text-[#F5F5F5] font-semibold text-lg">{title}</h3>
        <p className="text-[#858585] text-sm mt-1">{message}</p>
      </div>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm"
          className="border-[rgba(229,9,20,0.3)] text-[#F5F5F5] hover:bg-[#250A0A]">
          Try Again
        </Button>
      )}
    </div>
  );
}

