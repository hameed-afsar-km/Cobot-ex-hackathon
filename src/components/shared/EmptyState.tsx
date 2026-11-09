// src/components/shared/EmptyState.tsx
'use client';

import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
      {Icon && (
        <div className="w-16 h-16 rounded-full bg-[#190707] border border-[rgba(229,9,20,0.2)] flex items-center justify-center">
          <Icon className="w-7 h-7 text-[#858585]" />
        </div>
      )}
      <div>
        <h3 className="text-[#F5F5F5] font-semibold text-lg">{title}</h3>
        {description && <p className="text-[#858585] text-sm mt-1">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

