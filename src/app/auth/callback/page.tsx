'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

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

          if (data.session) {
            const userEmail = data.session.user.email?.toLowerCase() || '';
            const isAdmin = userEmail === 'wasya92@gmail.com';

            console.log('OAuth callback - User email:', userEmail, 'Is admin:', isAdmin);

            // Call setup-profile API
            if (data.session.user.email) {
              try {
                const apiResponse = await fetch('/api/admin/setup-profile', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    userId: data.session.user.id,
                    email: data.session.user.email,
                  }),
                });
                const apiData = await apiResponse.json();
                console.log('Profile setup API response:', apiData);

                if (!apiData.success) {
                  console.error('API failed:', apiData);
                }
              } catch (apiError) {
                console.error('Failed to call setup-profile API:', apiError);
              }
            }

            // Wait and then check profile from database
            await new Promise(resolve => setTimeout(resolve, 1000));

            let { data: profile } = await supabase
              .from('profiles')
              .select('is_admin, email, role')
              .eq('id', data.session.user.id)
              .maybeSingle();

            console.log('Final profile check:', profile);

            // Redirect based on admin status
            if (profile?.is_admin) {
              console.log('Redirecting to admin dashboard');
              router.push('/admin/teachers');
            } else {
              console.log('Not admin, redirecting to home');
              // Not an admin - redirect to home with a message
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
        if (session?.user) {
          const userEmail = session.user.email?.toLowerCase() || '';
          const isAdmin = userEmail === 'wasya92@gmail.com';

          console.log('Session check - User email:', userEmail, 'Is admin:', isAdmin);

          // Call setup-profile API
          if (session.user.email) {
            try {
              const apiResponse = await fetch('/api/admin/setup-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: session.user.id,
                  email: session.user.email,
                }),
              });
              const apiData = await apiResponse.json();
              console.log('Profile setup API response:', apiData);

              if (!apiData.success) {
                console.error('API failed:', apiData);
              }
            } catch (apiError) {
              console.error('Failed to call setup-profile API:', apiError);
            }
          }

          // Wait and then check profile from database
          await new Promise(resolve => setTimeout(resolve, 1000));

          let { data: profile } = await supabase
            .from('profiles')
            .select('is_admin, email, role')
            .eq('id', session.user.id)
            .maybeSingle();

          console.log('Final profile check:', profile);

          if (profile?.is_admin) {
            console.log('Redirecting to admin dashboard');
            router.push('/admin/teachers');
          } else {
            console.log('Not admin, redirecting to home');
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
