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
        // Get session from browser storage (Supabase sets it automatically)
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          router.push('/');
          return;
        }

        // Get user's profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();

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

        await refreshProfile();
        router.push(redirectUrl);
      } catch {
        router.push('/?error=callback_failed');
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center">
      <div className="text-white text-xl">Signing you in...</div>
    </div>
  );
}
