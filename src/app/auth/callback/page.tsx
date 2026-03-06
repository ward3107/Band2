'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const PROFILE_CACHE_KEY = 'band2_profile_cache';

export default function OAuthCallbackPage() {
  const router = useRouter();
  const { loading: authLoading } = useAuth();
  const handled = useRef(false);

  useEffect(() => {
    // Wait for AuthContext's onAuthStateChange (INITIAL_SESSION) to finish.
    // This releases the navigator lock so exchangeCodeForSession won't contend.
    if (authLoading) return;
    if (handled.current) return;
    handled.current = true;

    const params = new URLSearchParams(window.location.search);

    // Surface any OAuth-level error Supabase puts in the URL
    const oauthError = params.get('error');
    if (oauthError) {
      router.push(`/?error=${encodeURIComponent(params.get('error_description') ?? oauthError)}`);
      return;
    }

    const code = params.get('code');
    if (!code) {
      // No code in URL — nothing to exchange, go home
      router.push('/');
      return;
    }

    // Manually exchange the PKCE code for a session.
    // AuthContext's initial load is done so the navigator lock is free.
    handleCodeExchange(code);
  }, [authLoading, router]);

  async function handleCodeExchange(code: string) {
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error || !data.session?.user) {
        router.push(`/?error=${encodeURIComponent(error?.message ?? 'no_session')}`);
        return;
      }

      const session = data.session;

      // Check for existing profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, id, email, full_name, avatar_url, is_admin')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profile?.role) {
        // Cache the profile so the next page finds it instantly
        try { sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile)); } catch {}
        router.push(profile.role === 'teacher' ? '/teacher/dashboard' : '/student');
        return;
      }

      // No profile yet — check if this is an approved teacher
      const { data: approvedTeacher } = await supabase
        .from('approved_teachers')
        .select('full_name, is_admin')
        .eq('email', session.user.email)
        .maybeSingle();

      if (approvedTeacher) {
        const fullName = approvedTeacher.full_name
          || session.user.user_metadata?.full_name
          || session.user.user_metadata?.name
          || session.user.email?.split('@')[0];

        const newProfile = {
          id: session.user.id,
          email: session.user.email,
          full_name: fullName,
          role: 'teacher' as const,
          is_admin: approvedTeacher.is_admin ?? false,
          avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null,
          created_at: new Date().toISOString(),
        };

        // Use upsert to handle race conditions (409 Conflict if profile
        // was already created by a concurrent request)
        const { error: upsertError } = await supabase
          .from('profiles')
          .upsert(newProfile, { onConflict: 'id' });

        if (!upsertError) {
          try { sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(newProfile)); } catch {}
          router.push('/teacher/dashboard');
          return;
        }

        // Upsert failed — check if profile exists now (last resort)
        const { data: existing } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();

        if (existing?.role === 'teacher') {
          router.push('/teacher/dashboard');
          return;
        }
      }

      // Not an approved teacher — send to complete-profile (student signup)
      router.push('/auth/complete-profile');
    } catch {
      router.push('/?error=callback_failed');
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center">
      <div className="text-center">
        <div className="text-white text-xl mb-4">Signing you in...</div>
        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
      </div>
    </div>
  );
}
