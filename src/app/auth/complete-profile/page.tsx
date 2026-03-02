'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function CompleteProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<'teacher' | 'student'>('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already has profile with role, or no user
  useEffect(() => {
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
  }, [user, profile, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!user) {
        setError('No user found. Please sign in again.');
        return;
      }

      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (existingProfile) {
        // Update existing profile with role
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            role,
            full_name: existingProfile.full_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (updateError) throw updateError;
      } else {
        // Create new profile
        const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';

        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email!,
            full_name: fullName,
            avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
            role,
          });

        if (insertError) throw insertError;
      }

      // Refresh profile and redirect
      await refreshProfile();

      if (role === 'teacher') {
        router.push('/teacher/dashboard');
      } else {
        router.push('/student/join-class');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to complete profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
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
          <div className="text-6xl mb-2">📚</div>
          <h1 className="text-3xl font-bold text-white">Vocab Band II</h1>
          <p className="text-blue-200">Complete Your Profile</p>
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
              {user.email?.[0].toUpperCase()}
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Welcome, {user.user_metadata?.full_name || user.user_metadata?.name || user.email}
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

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                I am a...
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    role === 'student'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="text-4xl mb-2">🎓</div>
                  <div className="font-semibold text-gray-900 dark:text-white">Student</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Learn vocabulary
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('teacher')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    role === 'teacher'
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="text-4xl mb-2">👩‍🏫</div>
                  <div className="font-semibold text-gray-900 dark:text-white">Teacher</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Manage classes
                  </div>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              {loading ? 'Setting up...' : 'Continue'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm"
            >
              Sign out and use different account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
