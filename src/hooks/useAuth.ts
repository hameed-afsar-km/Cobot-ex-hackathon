// src/hooks/useAuth.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { onAuthChange, signInWithGoogle, signOut } from '@/lib/firebase/auth';
import { linkAdminOnLogin, getAdminUser } from '@/lib/services/adminService';
import type { AdminUser } from '@/types/admin';

interface AuthState {
  user: User | null;
  adminUser: AdminUser | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    adminUser: null,
    loading: true,
    isAdmin: false,
    isSuperAdmin: false,
  });

  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      if (!user) {
        setState({ user: null, adminUser: null, loading: false, isAdmin: false, isSuperAdmin: false });
        return;
      }

      try {
        const adminUser = await linkAdminOnLogin(user);
        setState({
          user,
          adminUser,
          loading: false,
          isAdmin: adminUser !== null && adminUser.active,
          isSuperAdmin: adminUser !== null && adminUser.active && adminUser.role === 'super_admin',
        });
      } catch {
        setState({ user, adminUser: null, loading: false, isAdmin: false, isSuperAdmin: false });
      }
    });

    return unsubscribe;
  }, []);

  const login = useCallback(async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut();
  }, []);

  return { ...state, login, logout };
}

