// src/components/admin/AdminHeader.tsx
'use client';

import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, User, ExternalLink } from 'lucide-react';
import type { AdminUser } from '@/types/admin';
import Link from 'next/link';
import { toast } from 'sonner';

interface AdminHeaderProps {
  adminUser: AdminUser | null;
}

export function AdminHeader({ adminUser }: AdminHeaderProps) {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Signed out successfully');
    } catch {
      toast.error('Sign-out failed');
    }
  };

  const initials = (adminUser?.displayName ?? user?.displayName ?? 'A')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const roleBadge = adminUser?.role === 'super_admin' ? 'Super Admin' : 'Admin';

  return (
    <header className="flex items-center justify-between px-6 py-3.5 bg-[#0a0a0a] border-b border-[rgba(185,185,185,0.08)]">
      <div className="flex items-center gap-2">
        <span className="text-xs text-[#858585]">Competition Admin</span>
        <span className="text-[rgba(185,185,185,0.3)]">•</span>
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
          adminUser?.role === 'super_admin'
            ? 'text-[#E50914] border-[rgba(229,9,20,0.3)] bg-[rgba(229,9,20,0.08)]'
            : 'text-[#858585] border-[rgba(185,185,185,0.2)] bg-[rgba(185,185,185,0.05)]'
        }`}>
          {roleBadge}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-1.5 text-xs text-[#858585] hover:text-[#F5F5F5] transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          Public View
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 group outline-none cursor-pointer">
            <Avatar className="w-8 h-8 border border-[rgba(229,9,20,0.3)]">
              <AvatarFallback className="bg-[#190707] text-[#E50914] text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-medium text-[#F5F5F5]">
                {adminUser?.displayName ?? user?.displayName ?? 'Admin'}
              </p>
              <p className="text-xs text-[#858585] truncate max-w-[140px]">
                {adminUser?.email ?? user?.email}
              </p>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="bg-[#111111] border-[rgba(185,185,185,0.12)] text-[#F5F5F5] min-w-[180px]"
          >
            <div className="px-3 py-2">
              <p className="text-xs font-medium text-[#F5F5F5]">
                {adminUser?.displayName ?? 'Admin'}
              </p>
              <p className="text-xs text-[#858585] truncate">{adminUser?.email}</p>
            </div>
            <DropdownMenuSeparator className="bg-[rgba(185,185,185,0.1)]" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="flex items-center gap-2 text-[#858585] hover:text-[#E50914] hover:bg-[rgba(229,9,20,0.08)] cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

