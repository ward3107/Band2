'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';

export default function HomePage() {
  const { signIn, signUp, signInWithGoogle, user } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const [role, setRole] = useState<'teacher' | 'student'>('student');
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [teacherCode, setTeacherCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Read OAuth error from URL params (set by /auth/callback on failure)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlError = params.get('error');
    if (urlError) {
      const messages: Record<string, string> = {
        access_denied: 'Google sign-in was cancelled.',
        session_failed: 'Failed to establish session. Please try again.',
        callback_failed: 'Sign-in failed. Please try again.',
      };
      setError(messages[urlError] || 'Sign-in failed. Please try again.');
      // Clean up URL without reload
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Prevent scrolling on login page
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.height = '100vh';
    document.documentElement.style.height = '100vh';
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.style.height = '';
      document.documentElement.style.height = '';
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Login
        const result = await signIn(email, password);
        if (result.error) {
          setError(result.error);
        } else {
          // Check user's role from profile
          const { supabase } = await import('@/lib/supabase');
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', result.data?.user?.id)
            .single();

          const userRole = profile?.role;

          if (userRole === 'teacher') {
            router.push('/teacher/dashboard');
          } else {
            router.push('/student');
          }
        }
      } else {
        // Sign up
        if (!fullName.trim()) {
          setError(t('nameRequired'));
          setLoading(false);
          return;
        }
        const result = await signUp(email, password, fullName, role);
        if (result.error) {
          setError(result.error);
        } else {
          // Redirect based on role
          if (role === 'teacher') {
            router.push('/teacher/dashboard');
          } else {
            router.push('/student/join-class');
          }
        }
      }
    } catch (err: any) {
      setError(err?.message || t('errorOccurred'));
    } finally {
      setLoading(false);
    }
  };

  const handleTeacherCodeSubmit = async (e: React.FormEvent) => {
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
      setError(err?.message || t('errorOccurred'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4 py-8">
      {/* Two Equal Cards Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-5xl">
        {/* Left Card - Logo, Title & Role Selector */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-5 sm:p-8 flex flex-col">
          {/* Logo & Title */}
          <div className="text-center mb-8">
            <div className="text-4xl sm:text-6xl mb-3">📚</div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('appTitle')}</h1>
            <p className="text-gray-600 dark:text-gray-400">{t('appSubtitle')}</p>
          </div>

          {/* Role Selector */}
          <div className="bg-gray-100 dark:bg-gray-700/50 rounded-2xl p-2 flex gap-2">
            <button
              onClick={() => setRole('student')}
              className={`flex-1 py-4 px-4 rounded-xl font-semibold transition-all ${
                role === 'student'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              🎓 {t('roleStudent')}
            </button>
            <button
              onClick={() => setRole('teacher')}
              className={`flex-1 py-4 px-4 rounded-xl font-semibold transition-all ${
                role === 'teacher'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              👩‍🏫 {t('roleTeacher')}
            </button>
          </div>

          {/* Info at bottom */}
          <div className="mt-auto pt-8 text-center text-gray-600 dark:text-gray-400 text-sm">
            {role === 'teacher' ? (
              <p>{t('createClassDescription')}</p>
            ) : (
              <p>{t('noAssignments')}</p>
            )}
          </div>
        </div>

        {/* Right Card - Login Form */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-5 sm:p-8 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-4xl">{role === 'teacher' ? '👩‍🏫' : '🎓'}</span>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {role === 'teacher'
                ? t('teacherLogin')
                : isLogin ? t('loginTitle') : t('createStudentAccount')}
            </h2>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 rounded-lg">
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}

          {role === 'teacher' ? (
            /* Teacher: code-only sign-in */
            <form onSubmit={handleTeacherCodeSubmit} className="space-y-4 flex-1">
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
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-lg tracking-widest text-center"
                  placeholder="ABC123"
                  maxLength={8}
                  required
                  autoComplete="off"
                  autoCapitalize="characters"
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
                {loading ? t('loading') : 'Sign In'}
              </button>

              {/* Divider */}
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">Admin?</span>
                </div>
              </div>

              {/* Google Sign In for admin teachers */}
              <button
                type="button"
                onClick={async () => {
                  setError('');
                  setLoading(true);
                  const { error } = await signInWithGoogle();
                  if (error) {
                    setError(error.message || 'Failed to sign in with Google');
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-semibold py-3 px-4 rounded-lg transition-colors"
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
          ) : (
            /* Student: email + password sign-in/up */
            <>
              <form onSubmit={handleSubmit} className="space-y-4 flex-1">
                {!isLogin && (
                  <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('fullName')}
                    </label>
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={t('namePlaceholder')}
                      required={!isLogin}
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('email')}
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('emailPlaceholder')}
                    required
                    autoComplete="username"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('password')}
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('passwordPlaceholder')}
                    required
                    minLength={6}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  {loading ? t('loading') : isLogin ? t('signIn') : t('signUp')}
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">Or continue with</span>
                </div>
              </div>

              {/* Google Sign In Button */}
              <button
                onClick={async () => {
                  setError('');
                  setLoading(true);
                  const { error } = await signInWithGoogle();
                  if (error) {
                    setError(error.message || 'Failed to sign in with Google');
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </button>

              <div className="mt-6 text-center">
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                >
                  {isLogin ? t('noAccount') : t('hasAccount')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
