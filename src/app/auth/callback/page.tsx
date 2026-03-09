'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { validateAdminEmail } from '@/lib/admin';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (error) {
        setError(errorDescription || error);
        return;
      }

      if (code) {
        try {
          // Exchange the code for a session
          const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

          if (sessionError) {
            setError(sessionError.message);
            return;
          }

          if (data.session && data.session.user.email) {
            // Check if email is admin via server-side API
            const { isAdmin: isAdminEmail } = await validateAdminEmail(data.session.user.email);

            // Create/update profile WITHOUT granting admin automatically
            try {
              await fetch('/api/admin/setup-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: data.session.user.id,
                  email: data.session.user.email,
                }),
              });
            } catch (apiError) {
              // Silently fail - will check profile below
            }

            // Wait for profile to be created/updated
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Check if user is admin
            let { data: profile } = await supabase
              .from('profiles')
              .select('is_admin')
              .eq('id', data.session.user.id)
              .maybeSingle();

            // Redirect based on admin status
            if (isAdminEmail && !profile?.is_admin) {
              // Admin email but not verified - send to password verification
              router.push('/auth/verify-admin');
            } else if (profile?.is_admin) {
              // Already verified admin
              router.push('/admin/teachers');
            } else {
              // Not an admin
              router.push('/?not-admin=true');
            }
          }
        } catch (err: any) {
          setError(err?.message || 'Authentication failed');
        }
      } else {
        // No code and no error - might be a page reload after auth
        // Try to get the session and redirect appropriately
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && session.user.email) {
          // Check if email is admin via server-side API
          const { isAdmin: isAdminEmail } = await validateAdminEmail(session.user.email);

          // Call setup-profile API
          if (session.user.email) {
            try {
              await fetch('/api/admin/setup-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: session.user.id,
                  email: session.user.email,
                }),
              });
            } catch (apiError) {
              // Silently fail - will check profile below
            }
          }

          // Wait for profile to be created/updated
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Check if user is admin
          let { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', session.user.id)
            .maybeSingle();

          // Redirect based on admin status
          if (isAdminEmail && !profile?.is_admin) {
            // Admin email but not verified - send to password verification
            router.push('/auth/verify-admin');
          } else if (profile?.is_admin) {
            // Already verified admin
            router.push('/admin/teachers');
          } else {
            // Not an admin
            router.push('/');
          }
        } else {
          router.push('/admin/login');
        }
      }
    };

    handleCallback();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
          <div className="text-center">
            <div className="text-4xl mb-4">❌</div>
            <h1 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Authentication Error</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
            <a
              href="/admin/login"
              className="inline-block bg-gray-800 hover:bg-gray-900 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              Back to Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin text-5xl mb-4">🔄</div>
        <p className="text-white text-lg">Completing sign in...</p>
      </div>
    </div>
  );
}
