// src/components/admin/AdminSidebar.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Users, Target, BarChart3, Play, Activity, Settings,
  UserCog, Menu, X, ChevronRight, LayoutDashboard
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const navItems = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/teams', label: 'Teams', icon: Users },
  { href: '/admin/rounds', label: 'Rounds & Scoring', icon: Target },
  { href: '/admin/leaderboard', label: 'Leaderboard', icon: BarChart3 },
  { href: '/admin/reveal', label: 'Reveal Control', icon: Play },
  { href: '/admin/activity', label: 'Activity Log', icon: Activity },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
  { href: '/admin/administrators', label: 'Administrators', icon: UserCog, superAdminOnly: true },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { isSuperAdmin } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (item: { href: string; exact?: boolean }) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-[#0a0a0a] border-r border-[rgba(185,185,185,0.08)] transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-56'
        }`}
      >
        {/* Logo */}
        <div className={`flex items-center gap-3 p-4 border-b border-[rgba(185,185,185,0.08)] ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-lg bg-[#190707] border border-[rgba(229,9,20,0.4)] flex items-center justify-center flex-shrink-0">
            <Trophy className="w-4 h-4 text-[#E50914]" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="font-bold text-sm text-[#F5F5F5] whitespace-nowrap overflow-hidden"
              >
                Admin Panel
              </motion.span>
            )}
          </AnimatePresence>
          <button
            onClick={() => setCollapsed(c => !c)}
            className={`ml-auto text-[#858585] hover:text-[#F5F5F5] transition-colors ${collapsed ? 'hidden' : ''}`}
          >
            <ChevronRight className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {navItems.map(item => {
            if (item.superAdminOnly && !isSuperAdmin) return null;
            const active = isActive(item);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${
                  active
                    ? 'bg-[#190707] text-[#E50914] border border-[rgba(229,9,20,0.3)]'
                    : 'text-[#858585] hover:text-[#F5F5F5] hover:bg-[rgba(255,255,255,0.03)]'
                } ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-[#E50914]' : ''}`} />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="text-sm font-medium whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {active && !collapsed && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-[#E50914]"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle for expanded */}
        {collapsed && (
          <div className="p-2 border-t border-[rgba(185,185,185,0.08)]">
            <button
              onClick={() => setCollapsed(false)}
              className="w-full flex justify-center text-[#858585] hover:text-[#F5F5F5] p-2"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

