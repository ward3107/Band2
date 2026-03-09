'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { useAuth } from '@/contexts/AuthContext';
import { SentryErrorBoundary } from './SentryErrorBoundary';

/**
 * SentryProvider - Wraps the app to provide user context to Sentry
 * This allows you to track errors by user and see which users experienced issues
 */
export function SentryProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();

  useEffect(() => {
    if (user && profile) {
      // Set user context in Sentry
      Sentry.setUser({
        id: user.id,
        email: user.email || undefined,
        username: profile.full_name || undefined,
        role: profile.role,
        isAdmin: profile.is_admin,
      });
    } else {
      // Clear user context when logged out
      Sentry.setUser(null);
    }
  }, [user, profile]);

  return <>{children}</>;
}

// Export SentryErrorBoundary for convenience
export { SentryErrorBoundary };
