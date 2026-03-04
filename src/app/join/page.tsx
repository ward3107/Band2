'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuth();
  const [classCode, setClassCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [joinedClassName, setJoinedClassName] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) setClassCode(code.toUpperCase());

    // If already signed in as a student, go straight to dashboard
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();
        if (profile?.role === 'student') {
          router.push('/student');
          return;
        }
      }
      setChecking(false);
    });
  }, [searchParams, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/student/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classCode: classCode.trim().toUpperCase(),
          displayName: displayName.trim(),
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || 'Failed to join class. Please try again.');
        setLoading(false);
        return;
      }

      const result = await signIn(json.credentials.email, json.credentials.password);
      if (result.error) {
        setError('Joined class but could not sign in. Please refresh and try again.');
        setLoading(false);
        return;
      }
      router.push('/student');
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-sm w-full">
      {/* Logo */}
      <div className="text-center mb-6">
        <div className="text-5xl mb-2">📚</div>
        <h1 className="text-2xl font-bold text-white">Vocab Band II</h1>
        <p className="text-green-200 text-sm">Join your class — no account needed</p>
      </div>

      {/* Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Enter class details</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          Your teacher shared a code via WhatsApp
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 rounded-lg">
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Class code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Class Code
            </label>
            <input
              type="text"
              value={classCode}
              onChange={(e) => setClassCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center text-2xl font-mono tracking-[0.3em] focus:border-green-500 focus:outline-none transition-colors"
              placeholder="ABC123"
              maxLength={6}
              autoComplete="off"
              autoCapitalize="characters"
              required
            />
          </div>

          {/* Display name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Your Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-green-500 focus:outline-none transition-colors"
              placeholder="e.g. Ali Hassan"
              maxLength={50}
              required
            />
            <p className="mt-1 text-xs text-gray-400">Your teacher will see this name</p>
          </div>

          <button
            type="submit"
            disabled={loading || classCode.length < 4 || displayName.trim().length < 2}
            className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-4 rounded-xl transition-colors text-base"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Joining...
              </span>
            ) : 'Join Class'}
          </button>
        </form>

        <div className="mt-5 text-center text-sm text-gray-400">
          Already have an account?{' '}
          <a href="/" className="text-green-600 dark:text-green-400 hover:underline font-medium">
            Sign in
          </a>
        </div>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 to-blue-700 flex items-start sm:items-center justify-center p-4 py-8">
      <Suspense fallback={<div className="text-white text-lg">Loading...</div>}>
        <JoinForm />
      </Suspense>
    </div>
  );
}
