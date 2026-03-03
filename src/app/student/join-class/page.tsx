'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function JoinClassPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [classCode, setClassCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Redirect unauthenticated users to the student login
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/student/join-class');
    }
  }, [user, authLoading, router]);

  // Show loading while auth is loading
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Ensure profile exists with student role
    if (!profile || profile.role !== 'student') {
      // Create or update profile as student
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email!,
          full_name: profile?.full_name || user.email?.split('@')[0] || 'Student',
          role: 'student',
        });

      if (profileError) {
        setError('Failed to set up student profile');
        setLoading(false);
        return;
      }
    }

    try {
      // Find class by code
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('*')
        .eq('class_code', classCode.toUpperCase().trim())
        .single();

      if (classError || !classData) {
        setError('Invalid class code. Please check and try again.');
        setLoading(false);
        return;
      }

      // Check if already enrolled
      const { data: existingEnrollment } = await supabase
        .from('class_enrollments')
        .select('*')
        .eq('class_id', classData.id)
        .eq('student_id', user.id)
        .single();

      if (existingEnrollment) {
        setError('You are already enrolled in this class.');
        setLoading(false);
        return;
      }

      // Enroll in class
      const { error: enrollError } = await supabase
        .from('class_enrollments')
        .insert({
          class_id: classData.id,
          student_id: user.id,
        });

      if (enrollError) {
        setError(enrollError.message || 'Failed to join class');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/student');
      }, 2000);

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
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
          <p className="text-blue-200">Join Your Class</p>
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
          {success ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Successfully Joined!
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Redirecting to your dashboard...
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Enter Class Code
              </h2>

              {error && (
                <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 rounded-lg">
                  <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Class Code
                  </label>
                  <input
                    type="text"
                    value={classCode}
                    onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="ABC123"
                    maxLength={6}
                    required
                  />
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                    Enter the 6-character code from your teacher
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || classCode.length !== 6}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  {loading ? 'Joining...' : 'Join Class'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => router.push('/')}
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                >
                  ← Back to Home
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
