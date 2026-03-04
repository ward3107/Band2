'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function OAuthCallbackPage() {
  const router = useRouter();
  const { refreshProfile } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Surface any OAuth-level error Supabase puts in the URL
        const params = new URLSearchParams(window.location.search);
        const oauthError = params.get('error');
        if (oauthError) {
          router.push(`/?error=${encodeURIComponent(params.get('error_description') ?? oauthError)}`);
          return;
        }

        // Get the session that Supabase JS exchanged from the ?code= param
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          router.push('/');
          return;
        }

        // Look up existing profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, is_admin')
          .eq('id', session.user.id)
          .maybeSingle();

        let redirectUrl = '/auth/complete-profile';

        if (profile?.role) {
          // Profile already exists — keep is_admin in sync with approved_teachers
          // (handles the case where is_admin was updated after first login)
          if (profile.role === 'teacher' && !profile.is_admin) {
            const { data: approvedTeacher } = await supabase
              .from('approved_teachers')
              .select('is_admin')
              .eq('email', session.user.email)
              .maybeSingle();
            if (approvedTeacher?.is_admin) {
              await supabase
                .from('profiles')
                .update({ is_admin: true })
                .eq('id', session.user.id);
            }
          }
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
              // Insert failed (e.g. row already exists with a different state).
              // Re-fetch the profile to see what role they actually have.
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

        await refreshProfile();
        router.push(redirectUrl);
      } catch {
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
