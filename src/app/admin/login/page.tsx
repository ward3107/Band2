'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { validateAdminEmail } from '@/lib/admin';
import { fetchWithCsrf } from '@/lib/csrf';
import { useRecaptcha } from '@/components/Recaptcha';
import { getRecaptchaSiteKey } from '@/lib/captcha';

export default function AdminLoginPage() {
  const { signIn, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [requiresCaptcha, setRequiresCaptcha] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  const recaptchaSiteKey = getRecaptchaSiteKey();
  const { token: captchaToken, error: captchaError, execute: executeRecaptcha, Component: RecaptchaComponent } = useRecaptcha(recaptchaSiteKey);

  // Execute CAPTCHA when ready if needed
  useEffect(() => {
    if (requiresCaptcha && captchaToken) {
      submitForm(captchaToken);
    }
  }, [captchaToken, requiresCaptcha]);

  const submitForm = async (recaptchaToken?: string) => {
    setError('');
    setLoading(true);

    // Check if email is admin via server-side API
    const { isAdmin } = await validateAdminEmail(email);

    if (!isAdmin) {
      setError('Access denied. Only the administrator can log in here.');
      setLoading(false);
      return;
    }

    try {
      const result = await signIn(email, password);
      if (result.error) {
        setError('Invalid email or password.');
        setLoading(false);
        return;
      }

      // For email/password login, verify password and grant admin access
      // since password was already provided
      const verifyResponse = await fetchWithCsrf('/api/admin/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          recaptchaToken,
        }),
      });

      const data = await verifyResponse.json();

      if (verifyResponse.ok) {
        // Password verified and admin granted
        router.push('/admin/teachers');
      } else if (data.requiresCaptcha) {
        // CAPTCHA required after failed attempts
        setRequiresCaptcha(true);
        setFailedAttempts((data.failedAttempts || 3));
        setError('');
        setLoading(false);
        executeRecaptcha();
      } else {
        setError(data.message || data.error || 'Verification failed');
        setLoading(false);
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (requiresCaptcha) {
      executeRecaptcha();
    } else {
      submitForm();
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setError(error.message || 'Failed to sign in with Google');
        setLoading(false);
      }
      // If successful, the OAuth flow will redirect to /auth/callback
    } catch (err: any) {
      setError(err?.message || 'An error occurred. Please try again.');
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
            ⚠️ This page is for administrators only. Teachers should use their code at{' '}
            <a href="/teacher/login" className="underline hover:text-amber-100">/teacher/login</a>
          </p>
        </div>

        {/* CAPTCHA Warning */}
        {requiresCaptcha && (
          <div className="mb-6 p-4 bg-blue-500/20 border border-blue-500/50 rounded-lg">
            <p className="text-blue-200 text-sm text-center">
              🔒 Multiple failed login attempts detected. Please complete the security verification.
            </p>
          </div>
        )}

        {/* Recaptcha Component */}
        {recaptchaSiteKey && <RecaptchaComponent action="admin_login" />}

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
                placeholder="admin@example.com"
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

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">or</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:bg-gray-100 dark:disabled:bg-gray-800 text-gray-900 dark:text-white font-semibold py-3 px-4 rounded-lg border border-gray-300 dark:border-gray-600 transition-colors flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
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
