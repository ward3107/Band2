'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { HelpDropdown } from '@/components/HelpDropdown';

export default function HomePage() {
  const { signIn } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const [role, setRole] = useState<'teacher' | 'student' | 'admin'>('student');

  // ── Student: join flow ──
  const [joinCode, setJoinCode] = useState('');
  const [joinName, setJoinName] = useState('');
  const [joinedClassName, setJoinedClassName] = useState('');
  const [joinedPersonalCode, setJoinedPersonalCode] = useState('');
  const [studentView, setStudentView] = useState<'join' | 'signin' | 'success'>('join');

  // ── Student: returning student code login ──
  const [returningCode, setReturningCode] = useState('');
  const [showReturning, setShowReturning] = useState(false);

  // ── Teacher: code login ──
  const [teacherCode, setTeacherCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isNewDevice, setIsNewDevice] = useState(false);
  const [showDeviceAlert, setShowDeviceAlert] = useState(false);

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/student/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classCode: joinCode.trim().toUpperCase(),
          displayName: joinName.trim(),
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
      setStudentView('success');
      setLoading(false);
    } catch (err: any) {
      console.error('Join class error:', err);
      setError(err?.message || 'An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleTeacherCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setIsNewDevice(false);
    setShowDeviceAlert(false);
    const code = teacherCode.trim().toUpperCase();
    if (!code) { setError('Please enter your teacher code.'); setLoading(false); return; }
    try {
      const result = await signIn(`${code}@teacher.band2.app`, code);
      if (result.error) {
        if (result.error?.includes('locked')) {
          setError(result.error);
        } else {
          setError('Invalid teacher code. Please check your code and try again.');
        }
      } else {
        if (result.isNewDevice) {
          setIsNewDevice(true);
          setShowDeviceAlert(true);
        }
        router.push('/teacher/dashboard');
      }
    } catch (err: any) {
      setError(err?.message || t('errorOccurred'));
    } finally {
      setLoading(false);
    }
  };

  const handleReturningStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setIsNewDevice(false);
    setShowDeviceAlert(false);
    const code = returningCode.trim().toUpperCase();
    if (!code) { setError('Please enter your personal code.'); setLoading(false); return; }
    try {
      const result = await signIn(`s_${code.toLowerCase()}@student.band2.app`, code);
      if (result.error) {
        if (result.error?.includes('locked')) {
          setError(result.error);
        } else {
          setError('Invalid code. Please check your personal code and try again.');
        }
      } else {
        if (result.isNewDevice) {
          setIsNewDevice(true);
          setShowDeviceAlert(true);
        }
        router.push('/student');
      }
    } catch (err: any) {
      setError(err?.message || t('errorOccurred'));
    } finally {
      setLoading(false);
    }
  };

  const handleSetStudent = useCallback(() => { setRole('student'); setError(''); }, []);
  const handleSetTeacher = useCallback(() => { setRole('teacher'); setError(''); }, []);
  const handleSetAdmin = useCallback(() => { router.push('/admin/login'); }, [router]);
  const handleToggleStudentView = useCallback(() => { setStudentView('signin'); setError(''); }, []);
  const handleBackToJoin = useCallback(() => { setStudentView('join'); setError(''); }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-start lg:items-center justify-center p-4 py-6 sm:py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-5xl">

        {/* ── Left Card: Logo + Role Selector ── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-5 sm:p-8 flex flex-col">
          <div className="text-center mb-8">
            <div className="text-4xl sm:text-6xl mb-3">📚</div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('appTitle')}</h1>
            <p className="text-gray-600 dark:text-gray-400">{t('appSubtitle')}</p>
          </div>

          <div className="bg-gray-100 dark:bg-gray-700/50 rounded-2xl p-2 flex gap-2">
            <button
              onClick={handleSetStudent}
              className={`flex-1 py-4 px-4 rounded-xl font-semibold transition-all ${
                role === 'student'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              🎓 {t('roleStudent')}
            </button>
            <button
              onClick={handleSetTeacher}
              className={`flex-1 py-4 px-4 rounded-xl font-semibold transition-all ${
                role === 'teacher'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              👩‍🏫 {t('roleTeacher')}
            </button>
            <button
              onClick={handleSetAdmin}
              className={`flex-1 py-4 px-4 rounded-xl font-semibold transition-all ${
                role === 'admin'
                  ? 'bg-gray-800 text-white shadow-lg'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              🔐 Admin
            </button>
          </div>

          {/* Help Dropdown */}
          <div className="mt-6 flex justify-center">
            <HelpDropdown buttonLabel="Get Help" />
          </div>

          <div className="mt-auto pt-8 text-center text-gray-600 dark:text-gray-400 text-sm">
            {role === 'teacher' ? (
              <p>{t('createClassDescription')}</p>
            ) : role === 'admin' ? (
              <p>Administrator access with Google authentication.</p>
            ) : (
              <p>Got a class code from your teacher? Enter it on the right.</p>
            )}
          </div>
        </div>

        {/* ── Right Card: Form ── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-5 sm:p-8 flex flex-col">

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 rounded-lg">
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}

          {showDeviceAlert && isNewDevice && (
            <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400 dark:border-yellow-600 rounded-lg">
              <p className="text-yellow-800 dark:text-yellow-200 text-sm font-medium">
                🔔 New Device Detected
              </p>
              <p className="text-yellow-700 dark:text-yellow-300 text-xs mt-1">
                You're logging in from a new device. If this wasn't you, please contact your teacher.
              </p>
            </div>
          )}

          {role === 'admin' ? (
            /* ── Admin: redirect to admin login with Google OAuth ── */
            <div className="flex flex-col items-center justify-center flex-1 text-center gap-6">
              <div className="text-5xl">🔐</div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Administrator Access</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">Sign in with Google to access the admin dashboard.</p>
              </div>
              <button
                onClick={handleSetAdmin}
                className="w-full max-w-xs bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold py-3 px-6 rounded-xl border border-gray-300 dark:border-gray-600 transition-colors flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400">Only for authorized administrators</p>
            </div>

          ) : role === 'teacher' ? (
            /* ── Teacher: code-only sign-in ── */
            <form onSubmit={handleTeacherCodeSubmit} className="space-y-4 flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl">👩‍🏫</span>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('teacherLogin')}</h2>
              </div>
              <div>
                <label htmlFor="teacherCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Teacher Code
                </label>
                <input
                  id="teacherCode"
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
            </form>

          ) : studentView === 'success' ? (
            /* ── Student: SUCCESS — show personal code before redirecting ── */
            <div className="flex flex-col items-center justify-center flex-1 text-center gap-4">
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
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors mt-2"
              >
                Got it, go to my class →
              </button>
            </div>

          ) : studentView === 'join' ? (
            /* ── Student: JOIN with class code (primary view) ── */
            <>
              <div className="flex items-center gap-3 mb-5">
                <span className="text-4xl">🎓</span>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Join Your Class</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">No account needed</p>
                </div>
              </div>

              <form onSubmit={handleJoinSubmit} className="space-y-4 flex-1">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Class Code
                  </label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center text-2xl font-mono tracking-[0.3em] focus:border-green-500 focus:outline-none transition-colors"
                    placeholder="ABC123"
                    maxLength={6}
                    autoComplete="off"
                    autoCapitalize="characters"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-400 text-center">6-character code from your teacher's WhatsApp</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={joinName}
                    onChange={(e) => setJoinName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-green-500 focus:outline-none transition-colors"
                    placeholder="e.g. Ali Hassan"
                    maxLength={50}
                    required
                  />
                  <p className="mt-1 text-xs text-gray-400">Your teacher will see this name</p>
                </div>

                <button
                  type="submit"
                  disabled={loading || joinCode.length < 4 || joinName.trim().length < 2}
                  className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-4 rounded-xl transition-colors"
                >
                  {loading ? 'Joining...' : 'Join Class →'}
                </button>
              </form>

              <div className="mt-5 text-center text-sm text-gray-400">
                Already have a personal code?{' '}
                <button
                  onClick={handleToggleStudentView}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  Sign in
                </button>
              </div>
            </>

          ) : (
            /* ── Student: SIGN IN with personal code (secondary view) ── */
            <>
              <div className="flex items-center gap-3 mb-5">
                <span className="text-4xl">🎓</span>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Student Sign In
                </h2>
              </div>

              <form onSubmit={handleReturningStudentSubmit} className="space-y-4 flex-1">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Your Personal Code
                  </label>
                  <input
                    type="text"
                    value={returningCode}
                    onChange={(e) => setReturningCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center text-2xl font-mono tracking-[0.2em] focus:border-blue-500 focus:outline-none transition-colors"
                    placeholder="AB3X7QKP"
                    maxLength={8}
                    autoComplete="off"
                    autoCapitalize="characters"
                    required
                  />
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Enter the 8-character code you received when you joined
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={loading || returningCode.length < 6}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  {loading ? 'Signing in...' : 'Sign In →'}
                </button>
              </form>

              <div className="mt-6 flex flex-col items-center gap-2 text-sm">
                <button onClick={handleBackToJoin} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs">
                  ← Join with class code instead
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
