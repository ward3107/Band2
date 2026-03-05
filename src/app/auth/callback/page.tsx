'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function OAuthCallbackPage() {
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    // Surface any OAuth-level error Supabase puts in the URL
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    const oauthError = params.get('error');
    if (oauthError) {
      router.push(`/?error=${encodeURIComponent(params.get('error_description') ?? oauthError)}`);
      return;
    }

    // Listen for auth state change — this fires AFTER Supabase exchanges the
    // code/hash for a real session. Much more reliable than calling getSession()
    // immediately (which races with the exchange and often returns null).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Only handle actual sign-in events (ignore INITIAL_SESSION with no user)
        if (!session?.user) return;

        // We only care about sign-in-related events
        if (event !== 'SIGNED_IN' && event !== 'TOKEN_REFRESHED' && event !== 'INITIAL_SESSION') return;

        subscription.unsubscribe();

        try {
          // Look up existing profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .maybeSingle();

          let redirectUrl = '/auth/complete-profile';

          if (profile?.role) {
            redirectUrl = profile.role === 'teacher' ? '/teacher/dashboard' : '/student';
          } else {
            // No profile yet — check if this is an approved teacher
            const { data: approvedTeacher } = await supabase
              .from('approved_teachers')
              .select('full_name, is_admin')
              .eq('email', session.user.email)
              .maybeSingle();

            if (approvedTeacher) {
              const { error: insertError } = await supabase
                .from('profiles')
                .insert({
                  id: session.user.id,
                  email: session.user.email,
                  full_name: approvedTeacher.full_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
                  role: 'teacher',
                  is_admin: approvedTeacher.is_admin ?? false,
                  created_at: new Date().toISOString(),
                });

              if (!insertError) {
                redirectUrl = '/teacher/dashboard';
              } else {
                const { data: existingProfile } = await supabase
                  .from('profiles')
                  .select('role')
                  .eq('id', session.user.id)
                  .maybeSingle();

                redirectUrl = existingProfile?.role === 'teacher'
                  ? '/teacher/dashboard'
                  : '/auth/complete-profile';
              }
            }
          }

          router.push(redirectUrl);
        } catch {
          router.push('/?error=callback_failed');
        }
      }
    );

    // Fallback: if no auth event fires within 10 seconds, try getSession directly
    const fallbackTimeout = setTimeout(async () => {
      subscription.unsubscribe();
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profile?.role) {
            router.push(profile.role === 'teacher' ? '/teacher/dashboard' : '/student');
          } else {
            router.push('/auth/complete-profile');
          }
        } else {
          router.push('/?error=no_session');
        }
      } catch {
        router.push('/?error=callback_failed');
      }
    }, 10000);

    // If the URL has a hash fragment (implicit flow) or code param (PKCE),
    // Supabase JS should automatically detect and exchange it, which will
    // trigger the onAuthStateChange above. But if there's neither, we need
    // to manually check.
    if (!params.get('code') && !hash.includes('access_token')) {
      // No auth params in URL — just check existing session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          // Let the onAuthStateChange handler deal with it
          return;
        }
        clearTimeout(fallbackTimeout);
        subscription.unsubscribe();
        router.push('/');
      });
    }

    return () => {
      clearTimeout(fallbackTimeout);
      subscription.unsubscribe();
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center">
      <div className="text-center">
        <div className="text-white text-xl mb-4">Signing you in...</div>
        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
      </div>
    </div>
  );
}
