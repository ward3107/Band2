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

    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash;

    // Surface any OAuth-level error Supabase puts in the URL
    const oauthError = params.get('error');
    if (oauthError) {
      router.push(`/?error=${encodeURIComponent(params.get('error_description') ?? oauthError)}`);
      return;
    }

    // Clear stale profile cache so the fresh profile (with is_admin etc.) is loaded
    try { sessionStorage.removeItem('band2_profile_cache'); } catch { /* ignore */ }

    async function handleCallback() {
      try {
        // For PKCE flow: explicitly exchange the code for a session
        const code = params.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error('Code exchange failed:', error.message);
            router.push(`/?error=${encodeURIComponent(error.message)}`);
            return;
          }
        } else if (hash.includes('access_token')) {
          // Implicit flow — Supabase detects the hash fragment via detectSessionInUrl.
          // Wait for onAuthStateChange to fire and set the session.
          const session = await new Promise<typeof import('@supabase/supabase-js').Session | null>((resolve) => {
            const timeout = setTimeout(() => resolve(null), 5000);
            const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
              if (session) {
                clearTimeout(timeout);
                subscription.unsubscribe();
                resolve(session);
              }
            });
          });
          if (!session) {
            router.push('/?error=no_session');
            return;
          }
        } else {
          // No auth params — redirect home
          router.push('/');
          return;
        }

        // At this point we should have a valid session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          router.push('/?error=no_session');
          return;
        }

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

        // Update last_login timestamp (fire-and-forget)
        supabase.from('profiles').update({ last_login: new Date().toISOString() }).eq('id', session.user.id).then();
        router.push(redirectUrl);
      } catch (err) {
        console.error('OAuth callback error:', err);
        router.push('/?error=callback_failed');
      }
    }

    handleCallback();
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
