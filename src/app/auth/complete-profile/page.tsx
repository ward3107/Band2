'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function CompleteProfilePage() {
  const { user, profile, refreshProfile, signOut: authSignOut, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already has profile with role, or no user
  useEffect(() => {
    // Wait for auth to finish loading before making redirect decisions
    if (authLoading) return;

    if (!user) {
      router.push('/');
      return;
    }

    if (profile?.role) {
      // Already has role, redirect appropriately
      if (profile.role === 'teacher') {
        router.push('/teacher/dashboard');
      } else {
        router.push('/student');
      }
    }
  }, [user, profile, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!user) {
        setError('No user found. Please sign in again.');
        return;
      }

      // Create profile as student
      const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Student';

      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email!,
          full_name: fullName,
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
          role: 'student',
        });

      if (insertError) throw insertError;

      // Cache the new profile in sessionStorage so the next page finds it
      // instantly (avoids redirect loop when useRoleGuard checks profile).
      const newProfile = {
        id: user.id,
        email: user.email!,
        full_name: fullName,
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        role: 'student',
      };
      try { sessionStorage.setItem('band2_profile_cache', JSON.stringify(newProfile)); } catch {}

      // Refresh profile in context and redirect
      await refreshProfile();
      router.push('/student/join-class');
    } catch (err: any) {
      setError(err?.message || 'Failed to complete profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-4xl sm:text-6xl mb-2">📚</div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Vocab Band II</h1>
          <p className="text-blue-200">Welcome, Student!</p>
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-5 sm:p-8">
          <div className="text-center mb-6">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
              {user.email?.[0].toUpperCase()}
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {user.user_metadata?.full_name || user.user_metadata?.name || user.email}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
              {user.email}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 rounded-lg">
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}

          <div className="text-center py-6">
            <div className="text-4xl sm:text-5xl mb-4">🎓</div>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              You're ready to start learning vocabulary!
            </p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            {loading ? 'Setting up...' : 'Start Learning'}
          </button>

          <div className="mt-6 text-center">
            <button
              onClick={async () => { await authSignOut(); router.push('/'); }}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm"
            >
              Sign out and use different account
            </button>
          </div>

          {/* Teacher info */}
          {user.email && (
            <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                <strong>Are you a teacher?</strong> Ask your admin to add your email to the approved list.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
