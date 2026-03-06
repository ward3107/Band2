'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface RoleGuardOptions {
  /** Where to send unauthenticated users. Defaults to '/'. */
  loginRedirect?: string;
  /** Where to send users with the wrong role. Defaults to '/'. */
  unauthorizedRedirect?: string;
}

/**
 * Redirects the user if they are not authenticated or do not have the
 * required role. Returns the full auth context so callers can destructure
 * whatever they need (user, profile, session, signOut, loading, …).
 */
export function useRoleGuard(
  requiredRole: 'teacher' | 'student',
  options?: RoleGuardOptions,
) {
  const auth = useAuth();
  const { user, profile, loading: authLoading } = auth;
  const router = useRouter();

  useEffect(() => {
    // Wait until auth has fully resolved (profile query included)
    if (authLoading) return;

    if (!user) {
      router.push(options?.loginRedirect ?? '/');
      return;
    }

    // Auth is done: if profile is still null the user has no row in the DB yet
    // (e.g. first OAuth login before completing profile setup).
    if (!profile) {
      router.push('/auth/complete-profile');
      return;
    }

    if (profile.role !== requiredRole) {
      router.push(options?.unauthorizedRedirect ?? '/');
    }
  }, [user, profile, authLoading, requiredRole, options?.loginRedirect, options?.unauthorizedRedirect, router]);

  // While auth is loading OR a redirect is about to happen, treat as loading
  // to prevent unauthorized content from flashing before navigation completes.
  const needsRedirect = !authLoading && (
    !user ||
    !profile ||
    profile.role !== requiredRole
  );
  return { ...auth, loading: authLoading || needsRedirect };
}
