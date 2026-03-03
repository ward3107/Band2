'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

export default function OAuthCallbackPage() {
  const router = useRouter();
  const { refreshProfile } = useAuth();

  useEffect(() => {
    const handleSessionRedirect = async (session: Session) => {
      console.log('Session found for:', session.user?.email);

      // Get user's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle();

      console.log('Profile:', profile);

      let redirectUrl = '/auth/complete-profile';

      if (profile?.role) {
        redirectUrl = profile.role === 'teacher' ? '/teacher/dashboard' : '/student';
      } else {
        // Check if approved teacher
        const { data: approvedTeacher } = await supabase
          .from('approved_teachers')
          .select('full_name')
          .eq('email', session.user.email)
          .maybeSingle();

        if (approvedTeacher) {
          await supabase
            .from('profiles')
            .insert({
              id: session.user.id,
              email: session.user.email,
              full_name: approvedTeacher.full_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
              role: 'teacher',
              is_admin: false,
              created_at: new Date().toISOString()
            });
          redirectUrl = '/teacher/dashboard';
        }
      }

      console.log('Redirecting to:', redirectUrl);
      await refreshProfile();
      router.push(redirectUrl);
    };

    const handleCallback = async () => {
      try {
        // Check for OAuth error params in the URL (e.g., user denied access)
        const params = new URLSearchParams(window.location.search);
        const oauthError = params.get('error');
        const errorDescription = params.get('error_description');

        if (oauthError) {
          console.error('OAuth error from provider:', oauthError, errorDescription);
          router.push(`/?error=${encodeURIComponent(oauthError)}`);
          return;
        }

        // Get session from browser storage (Supabase handles PKCE code exchange automatically)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError.message);
          router.push('/?error=session_failed');
          return;
        }

        if (session) {
          await handleSessionRedirect(session);
          return;
        }

        // Fallback: wait for auth state change event (handles async PKCE code exchange)
        console.log('No immediate session, waiting for auth state change...');
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            subscription.unsubscribe();
            if (newSession) {
              await handleSessionRedirect(newSession);
            } else {
              console.error('No session after OAuth callback');
              router.push('/');
            }
          }
        );
      } catch (err) {
        console.error('Callback error:', err);
        router.push('/?error=callback_failed');
      }
    };

    handleCallback();
  }, [router, refreshProfile]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center">
      <div className="text-white text-xl">Signing you in...</div>
    </div>
  );
}
