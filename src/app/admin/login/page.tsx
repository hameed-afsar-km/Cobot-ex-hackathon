// src/app/admin/login/page.tsx
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Trophy, AlertTriangle, Shield } from 'lucide-react';
import { toast } from 'sonner';

function LoginContent() {
  const { user, isAdmin, loading, login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (!loading && user && isAdmin) {
      router.replace('/admin');
    }
  }, [user, isAdmin, loading, router]);

  const handleLogin = async () => {
    setSigningIn(true);
    try {
      await login();
    } catch (err: any) {
      toast.error('Sign-in failed', {
        description: err?.message ?? 'An error occurred during sign-in.',
      });
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090909] flex items-center justify-center p-4">
      {/* Atmospheric background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[rgba(229,9,20,0.05)] blur-[80px] rounded-full" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[200px] bg-[rgba(229,9,20,0.03)] blur-[60px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative w-full max-w-sm"
      >
        {/* Card */}
        <div className="card-dark border border-[rgba(229,9,20,0.15)] rounded-2xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-[#190707] border border-[rgba(229,9,20,0.4)] flex items-center justify-center mx-auto mb-4 glow-red-sm">
              <Trophy className="w-8 h-8 text-[#E50914]" />
            </div>
            <h1 className="text-2xl font-bold text-[#F5F5F5]">Admin Dashboard</h1>
            <p className="text-[#858585] text-sm mt-1">Cobot-ex Competition Platform</p>
          </div>

          {/* Error message */}
          {error === 'unauthorized' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-start gap-3 p-3 rounded-lg bg-[rgba(229,9,20,0.08)] border border-[rgba(229,9,20,0.2)] mb-6"
            >
              <AlertTriangle className="w-4 h-4 text-[#E50914] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-[#E50914]">Access Denied</p>
                <p className="text-xs text-[#858585] mt-0.5">
                  Your Google account is not authorized. Contact a Super Admin to request access.
                </p>
              </div>
            </motion.div>
          )}

          {/* Security notice */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-[rgba(185,185,185,0.04)] border border-[rgba(185,185,185,0.08)] mb-6">
            <Shield className="w-4 h-4 text-[#858585] mt-0.5 flex-shrink-0" />
            <p className="text-xs text-[#858585]">
              Only explicitly authorized Google accounts can access administrative functionality.
            </p>
          </div>

          {/* Sign in button */}
          <Button
            onClick={handleLogin}
            disabled={signingIn || loading}
            className="w-full bg-white hover:bg-gray-100 text-[#111] font-semibold py-3 rounded-xl flex items-center justify-center gap-3 transition-all"
          >
            {signingIn ? (
              <>
                <div className="w-4 h-4 border-2 border-[#111]/30 border-t-[#111] rounded-full animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </>
            )}
          </Button>
        </div>

        {/* Back link */}
        <p className="text-center mt-6 text-xs text-[#858585]">
          <a href="/" className="hover:text-[#E50914] transition-colors">
            ← Back to Public Live Leaderboard
          </a>
        </p>
      </motion.div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#090909] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#111] border-t-[#E50914] rounded-full animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
