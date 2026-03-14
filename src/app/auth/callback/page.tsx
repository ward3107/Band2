'use client';

/**
 * ============================================
 * UNIFIED AUTH CALLBACK PAGE
 * ============================================
 *
 * WHY: This page handles Google OAuth for ALL users (Admin, Teacher, Student)
 *
 * HOW IT WORKS:
 * 1. User clicks "Sign in with Google" from login page
 * 2. Google redirects here after successful login
 * 3. We check if user already has a profile with a role:
 *    - YES → Redirect to their dashboard
 *    - NO → Show role selection screen
 * 4. If new user selects Teacher:
 *    - Ask for teacher invite code
 *    - Verify code is valid and not claimed
 *    - Create profile with role=teacher
 *    - Redirect to teacher dashboard
 * 5. If new user selects Student:
 *    - Ask for class code
 *    - Verify class exists
 *    - Create profile with role=student
 *    - Enroll in class
 *    - Redirect to student dashboard
 * ============================================
 */

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// Type definitions for our state
type Step = 'loading' | 'select-role' | 'teacher-code' | 'student-code' | 'error' | 'success';

// Track processed OAuth states globally to prevent double processing
// This persists across component remounts but resets on page reload
const processedStates = new Set<string>();

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshProfile } = useAuth();

  // State management
  const [step, setStep] = useState<Step>('loading');
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);

  // Form inputs
  const [selectedRole, setSelectedRole] = useState<'teacher' | 'student' | null>(null);
  const [teacherCode, setTeacherCode] = useState('');
  const [classCode, setClassCode] = useState('');
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);

  // Get state parameter for cache busting
  const stateParam = searchParams.get('state');

  useEffect(() => {
    // Check if this OAuth flow was already processed
    if (processedStates.has(stateParam || 'default')) {
      console.log('OAuth state already processed, skipping');
      return;
    }
    processedStates.add(stateParam || 'default');

    handleCallback();
  }, [stateParam]);

  /**
   * Main callback handler - runs when page loads after Google OAuth
   */
  const handleCallback = async () => {
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Check for OAuth errors
    if (errorParam) {
      setError(errorDescription || errorParam);
      setStep('error');
      return;
    }

    try {
      let currentSession = null;

      // If we have an OAuth code, exchange it for a session
      if (code) {
        // Clear any stale profile cache before processing new login
        try {
          sessionStorage.removeItem('band2_profile_cache');
        } catch {
          // Ignore sessionStorage errors
        }

        // Exchange code for session - this creates a fresh session
        const { data, error: sessionError } = await supabaseAdmin.auth.exchangeCodeForSession(code);

        if (sessionError) {
          // Try to recover session
          const { data: { session: recoveredSession } } = await supabaseAdmin.auth.getSession();
          if (recoveredSession) {
            currentSession = recoveredSession;
          } else {
            setError('Failed to complete sign in. Please try again.');
            setStep('error');
            return;
          }
        } else {
          currentSession = data.session;
        }
      } else {
        // No code - check for existing session
        const { data: { session: existingSession } } = await supabaseAdmin.auth.getSession();
        if (existingSession) {
          currentSession = existingSession;
        } else {
          // No session at all - redirect to login
          router.push('/');
          return;
        }
      }

      if (!currentSession?.user) {
        setError('No user found. Please try again.');
        setStep('error');
        return;
      }

      setSession(currentSession);

      // ============================================
      // STEP 1: Check if this is the ADMIN (by email)
      // The admin email is set in the ADMIN_EMAIL environment variable
      // ============================================
      const isAdminEmail = currentSession.user.email?.toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_EMAIL?.toLowerCase();

      if (isAdminEmail) {
        // This is the ADMIN - create/update profile with is_admin = true
        // Use server API to bypass RLS
        try {
          const response = await fetch('/api/admin/setup-profile', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${currentSession.access_token}`,
            },
            body: JSON.stringify({
              userId: currentSession.user.id,
              email: currentSession.user.email,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Admin profile setup failed:', response.status, errorData);
            setError(`Failed to set up admin profile: ${errorData.error || 'Server error'}. Check if SUPABASE_SERVICE_ROLE_KEY is set on Vercel.`);
            setStep('error');
            return;
          }

          console.log('Admin profile setup successful');
        } catch (err) {
          console.error('Admin profile setup error:', err);
          setError('Failed to connect to admin setup service. Please try again.');
          setStep('error');
          return;
        }

        // Refresh profile and redirect to admin dashboard
        await refreshProfile(currentSession.user.id);
        router.push('/admin/invite-codes');
        return;
      }

      // ============================================
      // STEP 2: Check if user already has a profile (for non-admin users)
      // ============================================
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id, role, is_admin')
        .eq('id', currentSession.user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Profile query error:', profileError);
      }

      // ============================================
      // STEP 3: Handle existing profile
      // ============================================
      if (profile) {
        await refreshProfile(currentSession.user.id);

        if (profile.is_admin) {
          router.push('/admin/invite-codes');
          return;
        }

        if (profile.role === 'teacher') {
          router.push('/teacher/dashboard');
          return;
        }

        if (profile.role === 'student') {
          router.push('/student');
          return;
        }

        // Has profile but no role? Ask them to select
        setStep('select-role');
        return;
      }

      // ============================================
      // STEP 4: New user - show role selection
      // ============================================
      setUserName(currentSession.user.user_metadata?.full_name || currentSession.user.user_metadata?.name || '');
      setStep('select-role');
    } catch (err: any) {
      console.error('Auth callback error:', err);
      setError(err?.message || 'Authentication failed');
      setStep('error');
    }
  };

  /**
   * Handle role selection - user chooses Teacher or Student
   */
  const handleRoleSelect = (role: 'teacher' | 'student') => {
    setSelectedRole(role);
    if (role === 'teacher') {
      setStep('teacher-code');
    } else {
      setStep('student-code');
    }
  };

  /**
   * Handle teacher code submission
   */
  const handleTeacherCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const code = teacherCode.trim().toUpperCase();

    if (!code) {
      setError('Please enter your teacher code.');
      setLoading(false);
      return;
    }

    try {
      // Call the database function to verify and claim the code
      const { data, error: rpcError } = await supabaseAdmin.rpc('claim_teacher_code', {
        p_code: code,
        p_user_id: session.user.id
      });

      if (rpcError) {
        setError('Failed to verify code. Please try again.');
        setLoading(false);
        return;
      }

      // Parse the JSON result
      const result = typeof data === 'string' ? JSON.parse(data) : data;

      if (!result.success) {
        setError(result.error);
        setLoading(false);
        return;
      }

      // Code is valid! Create profile with teacher role
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: session.user.id,
          email: session.user.email,
          full_name: userName || session.user.user_metadata?.full_name || '',
          role: 'teacher'
        });

      if (profileError) {
        // Rollback: unclaim the code
        await supabaseAdmin
          .from('teacher_invite_codes')
          .update({ is_claimed: false, claimed_by: null, claimed_at: null })
          .eq('code', code);

        setError('Failed to create profile. Please try again.');
        setLoading(false);
        return;
      }

      // Success! Refresh and redirect
      await refreshProfile(session.user.id);
      router.push('/teacher/dashboard');
    } catch (err: any) {
      console.error('Teacher code submission error:', err);
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle student class code submission
   */
  const handleStudentCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const code = classCode.trim().toUpperCase();

    if (!code) {
      setError('Please enter your class code.');
      setLoading(false);
      return;
    }

    if (!userName.trim()) {
      setError('Please enter your name.');
      setLoading(false);
      return;
    }

    try {
      // Find the class with this code
      const { data: classData, error: classError } = await supabaseAdmin
        .from('classes')
        .select('id, name')
        .eq('class_code', code)
        .maybeSingle();

      if (classError || !classData) {
        setError('Invalid class code. Please check and try again.');
        setLoading(false);
        return;
      }

      // Create profile with student role
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: session.user.id,
          email: session.user.email,
          full_name: userName.trim(),
          role: 'student'
        });

      if (profileError) {
        setError('Failed to create profile. Please try again.');
        setLoading(false);
        return;
      }

      // Enroll student in the class
      const { error: enrollError } = await supabaseAdmin
        .from('class_enrollments')
        .insert({
          student_id: session.user.id,
          class_id: classData.id
        });

      if (enrollError) {
        // Still proceed - profile is created, enrollment can be fixed later
        console.error('Enrollment error:', enrollError);
      }

      // Success! Refresh and redirect
      await refreshProfile(session.user.id);
      router.push('/student');
    } catch (err: any) {
      console.error('Student code submission error:', err);
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // RENDER: Different screens based on step
  // ============================================

  // ERROR SCREEN
  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
          <div className="text-center">
            <div className="text-4xl mb-4">❌</div>
            <h1 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Authentication Error</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
            <a
              href="/"
              className="inline-block bg-gray-800 hover:bg-gray-900 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              Back to Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  // LOADING SCREEN
  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin text-5xl mb-4">🔄</div>
          <p className="text-white text-lg">Signing you in...</p>
        </div>
      </div>
    );
  }

  // ROLE SELECTION SCREEN
  if (step === 'select-role') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">👋</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome!</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {session?.user?.email}
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-4">
              What would you like to do?
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => handleRoleSelect('teacher')}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-3"
            >
              <span className="text-2xl">👩‍🏫</span>
              <span>I'm a Teacher</span>
            </button>

            <button
              onClick={() => handleRoleSelect('student')}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-3"
            >
              <span className="text-2xl">🎓</span>
              <span>I'm a Student</span>
            </button>
          </div>

          <p className="text-center text-gray-400 text-xs mt-6">
            You'll need a code from your school to continue
          </p>

          <a
            href="/"
            className="block text-center text-gray-500 hover:text-gray-700 text-sm mt-4"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    );
  }

  // TEACHER CODE SCREEN
  if (step === 'teacher-code') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">👩‍🏫</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Teacher Verification</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
              Enter the code sent to you by your school administrator
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 rounded-lg">
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleTeacherCodeSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Teacher Code
              </label>
              <input
                type="text"
                value={teacherCode}
                onChange={(e) => setTeacherCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-mono text-xl tracking-widest text-center"
                placeholder="XXXX-XXXX"
                maxLength={12}
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading || teacherCode.length < 4}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              {loading ? 'Verifying...' : 'Continue →'}
            </button>
          </form>

          <button
            onClick={() => setStep('select-role')}
            className="w-full mt-4 text-gray-500 hover:text-gray-700 text-sm"
          >
            ← Choose different role
          </button>

          <a
            href="/"
            className="block text-center text-gray-400 hover:text-gray-600 text-xs mt-2"
          >
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  // STUDENT CODE SCREEN
  if (step === 'student-code') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-600 to-teal-700 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🎓</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Join Your Class</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
              Enter the class code from your teacher
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 rounded-lg">
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleStudentCodeSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Class Code
              </label>
              <input
                type="text"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 font-mono text-xl tracking-widest text-center"
                placeholder="ABC123"
                maxLength={8}
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-1 text-center">
                Ask your teacher for this code
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || classCode.length < 4 || userName.trim().length < 2}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              {loading ? 'Joining...' : 'Join Class →'}
            </button>
          </form>

          <button
            onClick={() => setStep('select-role')}
            className="w-full mt-4 text-gray-500 hover:text-gray-700 text-sm"
          >
            ← Choose different role
          </button>

          <a
            href="/"
            className="block text-center text-gray-400 hover:text-gray-600 text-xs mt-2"
          >
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  // Default: loading
  return null;
}
