'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, user, profile, loading: authLoading } = useAuth();
  const [classCode, setClassCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [joinedClassName, setJoinedClassName] = useState('');
  const [joinedPersonalCode, setJoinedPersonalCode] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [returningCode, setReturningCode] = useState('');
  const [showReturning, setShowReturning] = useState(false);

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) setClassCode(code.toUpperCase());
  }, [searchParams]);

  // If already signed in as a student, go straight to dashboard
  useEffect(() => {
    if (authLoading) return;
    if (user && profile?.role === 'student') {
      router.push('/student');
    }
  }, [authLoading, user, profile, router]);

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
      setJoinedClassName(json.className || '');
      setJoinedPersonalCode(json.studentCode || '');
      setShowSuccess(true);
      setLoading(false);
    } catch (err: any) {
      console.error('Join class error:', err);
      setError(err?.message || 'An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleReturningSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const code = returningCode.trim().toUpperCase();
    if (!code) { setError('Please enter your personal code.'); setLoading(false); return; }
    try {
      const result = await signIn(`s_${code.toLowerCase()}@student.band2.app`, code);
      if (result.error) {
        setError('Invalid code. Please check your personal code and try again.');
      } else {
        router.push('/student');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="max-w-sm w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 flex flex-col items-center text-center gap-4">
          <div className="text-5xl">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">You joined {joinedClassName}!</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Save your personal code — you'll need it to log back in on any device.</p>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-xl p-4 w-full">
            <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 uppercase tracking-wider mb-1">Your Personal Code</p>
            <p className="text-4xl font-mono font-bold text-yellow-800 dark:text-yellow-300 tracking-[0.2em]">{joinedPersonalCode}</p>
            <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-2">Screenshot this or write it down!</p>
          </div>
          <button
            onClick={() => router.push('/student')}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
          >
            Got it, go to my class →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-sm w-full">
      {/* Logo */}
      <div className="text-center mb-6">
        <div className="text-5xl mb-2">📚</div>
        <h1 className="text-2xl font-bold text-white">Vocaband</h1>
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

        {user && (
          <div className="mb-4 p-3 bg-amber-100 dark:bg-amber-900/30 border border-amber-400 dark:border-amber-600 rounded-lg">
            <p className="text-amber-800 dark:text-amber-200 text-sm font-medium">
              ⚠️ Already logged in as {user.email}
            </p>
            <p className="text-amber-700 dark:text-amber-300 text-xs mt-1">
              Joining here will sign out the current user. Use a different browser profile or incognito mode for multiple accounts.
            </p>
          </div>
        )}

        {/* Returning student shortcut */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => { setShowReturning(!showReturning); setError(''); }}
            className="w-full flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
          >
            <span>🔑 Already joined before? Use your personal code</span>
            <span>{showReturning ? '▲' : '▼'}</span>
          </button>
          {showReturning && (
            <form onSubmit={handleReturningSubmit} className="mt-3 space-y-3">
              <input
                type="text"
                value={returningCode}
                onChange={(e) => setReturningCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 rounded-xl border-2 border-blue-300 dark:border-blue-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center text-2xl font-mono tracking-[0.2em] focus:border-blue-500 focus:outline-none transition-colors"
                placeholder="AB3X7QKP"
                maxLength={8}
                autoComplete="off"
                autoCapitalize="characters"
              />
              <button
                type="submit"
                disabled={loading || returningCode.length < 6}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-colors"
              >
                {loading ? 'Signing in...' : 'Sign In with Code →'}
              </button>
            </form>
          )}
          <div className="relative mt-4 mb-1">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-600"></div></div>
            <div className="relative flex justify-center text-xs"><span className="px-2 bg-white dark:bg-gray-800 text-gray-400">or join a new class</span></div>
          </div>
        </div>

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
