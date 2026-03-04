'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [classCode, setClassCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [joinedClassName, setJoinedClassName] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) setClassCode(code.toUpperCase());

    // If already signed in as a student, redirect to dashboard
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
      // Create an anonymous Supabase session for this student
      const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
      if (authError || !authData.user || !authData.session) {
        setError('Could not create your session. Please try again.');
        setLoading(false);
        return;
      }

      // Send to server-side API which handles class lookup + enrollment
      const res = await fetch('/api/student/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authData.session.access_token}`,
        },
        body: JSON.stringify({
          classCode: classCode.trim().toUpperCase(),
          displayName: displayName.trim(),
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        // Sign out the anonymous user so they can try again cleanly
        await supabase.auth.signOut();
        setError(json.error || 'Failed to join class. Please try again.');
        setLoading(false);
        return;
      }

      setJoinedClassName(json.className || 'your class');
      setSuccess(true);
      setTimeout(() => router.push('/student'), 2000);
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
    <div className="max-w-md w-full">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-2">📚</div>
        <h1 className="text-3xl font-bold text-white">Vocab Band II</h1>
        <p className="text-green-200">Join Your Class — No account needed</p>
      </div>

      {/* Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
        {success ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              You joined {joinedClassName}!
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Taking you to your dashboard...
            </p>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              Enter Class Details
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Your teacher sent you a code via WhatsApp — enter it below.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 rounded-lg">
                <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Class Code
                </label>
                <input
                  type="text"
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="ABC123"
                  maxLength={6}
                  required
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-center">
                  6-character code from your teacher
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g. Ali Hassan"
                  maxLength={50}
                  required
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  This is how your teacher will identify you
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || classCode.length !== 6 || displayName.trim().length < 2}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                {loading ? 'Joining...' : 'Join Class'}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Have an account?{' '}
              <a href="/login" className="text-green-600 dark:text-green-400 hover:underline">
                Sign in instead
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 to-blue-700 flex items-center justify-center p-4">
      <Suspense fallback={
        <div className="text-white text-lg">Loading...</div>
      }>
        <JoinForm />
      </Suspense>
    </div>
  );
}
