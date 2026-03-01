'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';

export default function HomePage() {
  const { signIn, signUp, user } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const [role, setRole] = useState<'teacher' | 'student'>('student');
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
            .eq('id', result.data.user?.id)
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

  return (
    <div className="h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4 overflow-hidden">
      {/* Two Equal Cards Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-5xl min-w-0">
        {/* Left Card - Logo, Title & Role Selector */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 flex flex-col">
          {/* Logo & Title */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-3">📚</div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('appTitle')}</h1>
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
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-4xl">{role === 'teacher' ? '👩‍🏫' : '🎓'}</span>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isLogin
                ? (role === 'teacher' ? t('teacherLogin') : t('loginTitle'))
                : (role === 'teacher' ? t('createTeacherAccount') : t('createStudentAccount'))}
            </h2>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 rounded-lg">
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 flex-1">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('fullName')}
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={role === 'teacher' ? t('teacherNamePlaceholder') : t('namePlaceholder')}
                  required={!isLogin}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={role === 'teacher' ? t('teacherEmailPlaceholder') : t('emailPlaceholder')}
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('password')}
              </label>
              <input
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

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
            >
              {isLogin ? t('noAccount') : t('hasAccount')}
            </button>
          </div>

          {isLogin && role === 'teacher' && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
              <a
                href="/teacher/login"
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm"
              >
                {t('oldTeacherLogin')}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
