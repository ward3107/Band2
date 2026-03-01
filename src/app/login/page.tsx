'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { signIn, signUp, user } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<'teacher' | 'student'>('student');
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
          setError('Please enter your name');
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
      setError(err?.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-2">📚</div>
          <h1 className="text-3xl font-bold text-white">Vocab Band II</h1>
          <p className="text-blue-200">Israeli English Curriculum Learning Platform</p>
        </div>

        {/* Role Selector */}
        <div className="bg-white/20 dark:bg-gray-800/20 backdrop-blur-sm rounded-2xl p-2 mb-4 flex gap-2">
          <button
            onClick={() => setRole('student')}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
              role === 'student'
                ? 'bg-white text-blue-600 shadow-lg'
                : 'text-white hover:bg-white/10'
            }`}
          >
            🎓 Student
          </button>
          <button
            onClick={() => setRole('teacher')}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
              role === 'teacher'
                ? 'bg-white text-purple-600 shadow-lg'
                : 'text-white hover:bg-white/10'
            }`}
          >
            👩‍🏫 Teacher
          </button>
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-4xl">{role === 'teacher' ? '👩‍🏫' : '🎓'}</span>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isLogin ? (role === 'teacher' ? 'Teacher Login' : 'Student Login') : (role === 'teacher' ? 'Create Teacher Account' : 'Create Student Account')}
            </h2>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 rounded-lg">
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={role === 'teacher' ? 'Ms. Cohen' : 'John Smith'}
                  required={!isLogin}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={role === 'teacher' ? 'teacher@school.il' : 'student@email.com'}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              {loading ? 'Loading...' : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>

          {isLogin && role === 'teacher' && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
              <a
                href="/teacher/login"
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm"
              >
                Old teacher login →
              </a>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-6 text-center text-blue-200 text-sm">
          {role === 'teacher' ? (
            <p>For teachers to create assignments and track student progress</p>
          ) : (
            <p>For students to learn vocabulary and complete assignments</p>
          )}
        </div>
      </div>
    </div>
  );
}
