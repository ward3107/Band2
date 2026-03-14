'use client';

/**
 * ============================================
 * MAIN LOGIN PAGE
 * ============================================
 *
 * WHY: Single entry point for ALL users (Admin, Teacher, Student)
 *
 * HOW IT WORKS:
 * 1. User clicks "Sign in with Google"
 * 2. Google handles authentication
 * 3. Google redirects to /auth/callback
 * 4. Callback page checks if user has a role:
 *    - YES → Redirect to their dashboard
 *    - NO → Show role selection screen
 * ============================================
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { HelpDropdown } from '@/components/HelpDropdown';
import { supabaseAdmin, signInWithGoogle } from '@/lib/supabase';

export default function HomePage() {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle OAuth callback if it lands on home page
  useEffect(() => {
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');
    if (code || errorParam) {
      router.replace(`/auth/callback${window.location.search}`);
    }
  }, [searchParams, router]);

  // Redirect logged-in users to their dashboard
  useEffect(() => {
    if (user && profile) {
      if (profile.is_admin) {
        router.push('/admin/invite-codes');
      } else if (profile.role === 'teacher') {
        router.push('/teacher/dashboard');
      } else if (profile.role === 'student') {
        router.push('/student');
      }
    }
  }, [user, profile, router]);

  /**
   * Handle Google Sign In
   * This is now the ONLY login method for all roles
   */
  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    try {
      const { data, error: oauthError } = await signInWithGoogle();

      if (oauthError) {
        setError(oauthError.message || 'Failed to sign in with Google');
        setLoading(false);
        return;
      }

      // OAuth will redirect to /auth/callback
      // No need to do anything here - the redirect happens automatically
    } catch (err: any) {
      console.error('Google sign in error:', err);
      setError(err?.message || 'An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 flex items-center justify-center p-4">
      <div className="max-w-md w-full">

        {/* Logo Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">{t('appTitle')}</h1>
          <p className="text-blue-100">{t('appSubtitle')}</p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 rounded-lg">
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Already logged in check */}
          {user && profile ? (
            <div className="text-center py-4">
              <div className="text-2xl mb-2">✅</div>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                You're logged in as <strong>{profile.full_name || profile.email}</strong>
              </p>
              <p className="text-sm text-gray-500">Redirecting to your dashboard...</p>
            </div>
          ) : (
            <>
              {/* Google Sign In Button - for ALL users */}
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold py-4 px-6 rounded-xl border-2 border-gray-200 dark:border-gray-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {/* Google Logo SVG */}
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {loading ? 'Signing in...' : 'Sign in with Google'}
              </button>

              {/* Divider */}
              <div className="my-6 flex items-center">
                <div className="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
                <span className="px-4 text-sm text-gray-500 dark:text-gray-400">
                  {t('or') || 'or'}
                </span>
                <div className="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
              </div>

              {/* Role Info */}
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span className="text-xl">👩‍🏫</span>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Teachers</p>
                    <p className="text-gray-500 dark:text-gray-400">Sign in with Google, then enter your teacher code</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span className="text-xl">🎓</span>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Students</p>
                    <p className="text-gray-500 dark:text-gray-400">Sign in with Google, then enter your class code</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span className="text-xl">🔐</span>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Admin</p>
                    <p className="text-gray-500 dark:text-gray-400">Sign in with Google (pre-approved only)</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Help Section */}
        <div className="mt-6 flex justify-center">
          <HelpDropdown buttonLabel="Need Help?" />
        </div>

        {/* Footer */}
        <p className="text-center text-blue-100/70 text-xs mt-6">
          © 2026 Vocaband. All rights reserved.
        </p>
      </div>
    </div>
  );
}
