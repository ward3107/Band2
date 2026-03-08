'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

// Admin email - only this email can use the admin login
const ADMIN_EMAIL = 'wasya92@gmail.com';

export default function AdminLoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      setError('Access denied. Only the administrator can log in here.');
      setLoading(false);
      return;
    }

    try {
      const result = await signIn(email, password);
      if (result.error) {
        setError('Invalid email or password.');
      } else if (result.profile?.is_admin) {
        // Admin verified, redirect to admin page
        router.push('/admin/teachers');
      } else {
        setError('Access denied. Administrator privileges required.');
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-4xl sm:text-6xl mb-2">🔐</div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Vocaband</h1>
          <p className="text-gray-400">Admin Access</p>
        </div>

        {/* Warning */}
        <div className="mb-6 p-4 bg-amber-500/20 border border-amber-500/50 rounded-lg">
          <p className="text-amber-200 text-sm text-center">
            ⚠️ This page is for the administrator only. Teachers should use their code at{' '}
            <a href="/teacher/login" className="underline hover:text-amber-100">/teacher/login</a>
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-5 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Administrator Sign In
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 rounded-lg">
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Admin Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                placeholder={ADMIN_EMAIL}
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              {loading ? 'Signing in...' : 'Admin Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
            <a
              href="/"
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm"
            >
              ← Back to Home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
