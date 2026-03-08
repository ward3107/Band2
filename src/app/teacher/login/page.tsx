'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function TeacherLoginPage() {
  const { signIn, user } = useAuth();
  const router = useRouter();
  const [teacherCode, setTeacherCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const code = teacherCode.trim().toUpperCase();
    if (!code) {
      setError('Please enter your teacher code.');
      setLoading(false);
      return;
    }

    try {
      const result = await signIn(`${code}@teacher.band2.app`, code);
      if (result.error) {
        setError('Invalid teacher code. Please check your code and try again.');
      } else {
        router.push('/teacher/dashboard');
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-4xl sm:text-6xl mb-2">👩‍🏫</div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Vocaband</h1>
          <p className="text-indigo-200">Teacher Portal</p>
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-5 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Teacher Sign In
          </h2>

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
                Logging in here will sign out the current user. Use a different browser profile or incognito mode for multiple accounts.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="teacherCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Teacher Code
              </label>
              <input
                id="teacherCode"
                name="teacherCode"
                type="text"
                value={teacherCode}
                onChange={(e) => setTeacherCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-xl tracking-widest text-center"
                placeholder="ABC123"
                maxLength={8}
                required
                autoComplete="off"
                autoCapitalize="characters"
                autoFocus
              />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Enter the code provided by your school administrator.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
            <a
              href="/"
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm"
            >
              ← Back to Student App
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
