'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase, Profile, getCurrentProfile, signIn, signUp, signOut, signInWithGoogle } from '@/lib/supabase';
import { User, Session, AuthError } from '@supabase/supabase-js';
import {
  isAccountLocked,
  logLoginAttempt,
  recordDevice,
  incrementFailedAttempts,
  resetFailedAttempts,
  generateDeviceHash,
  getDeviceInfo,
} from '@/lib/code-auth';

interface SignInResult {
  data: { user: User | null; session: Session | null } | null;
  error: string | null;
  profile?: Profile | null;
  isNewDevice?: boolean;
}

interface SignUpResult {
  data: { user: User | null; session: Session | null } | null;
  error: string | null;
}

interface SignInWithGoogleResult {
  data: { provider: string; url: string | null };
  error: AuthError | null;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  hasOtherSession: boolean;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signInWithGoogle: () => Promise<SignInWithGoogleResult>;
  signUp: (email: string, password: string, fullName: string, role: 'teacher' | 'student') => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setSession: (session: Session | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSessionState] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasOtherSession, setHasOtherSession] = useState(false);
  const [channel, setChannel] = useState<BroadcastChannel | null>(null);

  // Initialize broadcast channel for tab sync
  useEffect(() => {
    // Check if BroadcastChannel is supported
    if (typeof BroadcastChannel !== 'undefined') {
      const authChannel = new BroadcastChannel('vocaband-auth');
      setChannel(authChannel);

      // Listen for auth events from other tabs
      authChannel.onmessage = (event) => {
        const { type, userId, userEmail } = event.data;

        if (type === 'SIGNED_IN') {
          // Another tab signed in - check if it's a different user
          if (user && user.id !== userId) {
            console.log('Another tab signed in with a different user');
            // Reload the page to get the new session
            window.location.reload();
          }
        } else if (type === 'SIGNED_OUT') {
          // Another tab signed out
          console.log('Another tab signed out');
          // Reload to clear session
          window.location.reload();
        }
      };

      return () => {
        authChannel.close();
      };
    }
  }, [user]);

  useEffect(() => {
    // Safety timeout: if auth never resolves (e.g. Supabase unreachable),
    // stop loading after 10 seconds so the UI doesn't hang forever.
    const safetyTimeout = setTimeout(() => {
      setLoading((prev) => {
        if (prev) console.warn('Auth loading timed out after 10s');
        return false;
      });
    }, 10_000);

    // Use onAuthStateChange as the single source of truth. INITIAL_SESSION
    // fires synchronously with the cached/stored session, so there is no need
    // for a separate getSession() call — which can race and cause navigator
    // lock contention (the "Lock not released within 5000ms" error).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSessionState(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // On fresh sign-in, clear cached profile to avoid stale data
        // (e.g. missing is_admin flag from a previous session)
        if (event === 'SIGNED_IN') {
          setCachedProfile(null);
        }
        // Do NOT await — the callback runs inside the navigator lock.
        // Awaiting a REST call here holds the lock open and causes the
        // "Lock not released within 5000ms" timeout.
        loadProfile(session.user.id);
      } else {
        setProfile(null);
        setCachedProfile(null);
        setLoading(false);
      }
      clearTimeout(safetyTimeout);
    });

    return () => {
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const PROFILE_CACHE_KEY = 'band2_profile_cache';

  const getCachedProfile = (userId: string): Profile | null => {
    try {
      const cached = sessionStorage.getItem(PROFILE_CACHE_KEY);
      if (!cached) return null;
      const parsed = JSON.parse(cached);
      if (parsed.id === userId) return parsed;
    } catch { /* ignore */ }
    return null;
  };

  const setCachedProfile = (profile: Profile | null) => {
    try {
      if (profile) {
        sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
      } else {
        sessionStorage.removeItem(PROFILE_CACHE_KEY);
      }
    } catch { /* ignore */ }
  };

  const loadProfile = async (userId: string): Promise<Profile | null> => {
    // Return cached profile instantly, skip DB round-trip on refresh
    const cached = getCachedProfile(userId);
    if (cached) {
      setProfile(cached);
      setLoading(false);
      return cached;
    }

    let profileData: Profile | null = null;
    try {
      // Race the profile query against an 8s timeout to prevent hanging
      const query = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      const result = await Promise.race([
        query,
        new Promise<{ data: null; error: { message: string } }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: { message: 'Profile load timed out' } }), 8_000)
        ),
      ]);

      profileData = result.error ? null : result.data;
      setProfile(profileData);
      setCachedProfile(profileData);
    } catch {
      setProfile(null);
    }
    setLoading(false);
    return profileData;
  };

  const handleSignIn = async (email: string, password: string) => {
    // Extract code prefix for logging (first part of email)
    const codePrefix = email.split('@')[0] || '';

    // Get IP and device info for logging
    const deviceHash = generateDeviceHash();
    const deviceInfo = getDeviceInfo();
    // Note: In production, get real IP from headers via server action
    const ipAddress = 'client-side'; // Will be updated by server if needed

    // Log the login attempt
    await logLoginAttempt({
      code_prefix: codePrefix,
      ip_address: ipAddress,
      user_agent: deviceInfo.userAgent,
      success: false, // Will update to true on success
    });

    const result = await signIn(email, password);

    if (result.data?.user) {
      // Check if account is locked BEFORE proceeding
      const lockCheck = await isAccountLocked(result.data.user.id);
      if (lockCheck.locked) {
        return {
          ...result,
          error: lockCheck.message || 'Account is locked. Please try again later.',
          profile: null,
        };
      }

      // Set user and session immediately so guards don't see a null user
      // before onAuthStateChange fires asynchronously.
      setUser(result.data.user);
      setSessionState(result.data.session);
      // Clear stale profile cache before loading fresh data
      setCachedProfile(null);
      const profile = await loadProfile(result.data.user.id);

      // Reset failed attempts on successful login
      await resetFailedAttempts(result.data.user.id);

      // Update login attempt to success
      await logLoginAttempt({
        user_id: result.data.user.id,
        code_prefix: codePrefix,
        ip_address: ipAddress,
        user_agent: deviceInfo.userAgent,
        success: true,
      });

      // Record/trust this device
      const deviceResult = await recordDevice(
        result.data.user.id,
        deviceHash,
        deviceInfo.userAgent,
        ipAddress
      );

      // Update last_login timestamp (fire-and-forget, swallow errors)
      void supabase.from('profiles').update({ last_login: new Date().toISOString() }).eq('id', result.data.user.id);

      // Broadcast to other tabs that a new user signed in
      if (channel) {
        channel.postMessage({
          type: 'SIGNED_IN',
          userId: result.data.user.id,
          userEmail: result.data.user.email,
        });
      }

      return {
        ...result,
        profile,
        isNewDevice: deviceResult.isNew,
      };
    }

    // Login failed - increment failed attempts
    // Note: We don't have user_id yet, so we track by IP/code prefix
    // The actual increment will happen server-side if we can identify the user
    if (result.error) {
      // For code-based auth, try to find the user by email to increment attempts
      try {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .maybeSingle();

        if (userProfile) {
          await incrementFailedAttempts(userProfile.id);
        }
      } catch {
        // Ignore errors on failed attempt tracking
      }
    }

    return { ...result, profile: null };
  };

  const handleSignInWithGoogle = async () => {
    const result = await signInWithGoogle();
    return result;
  };

  const handleSignUp = async (email: string, password: string, fullName: string, role: 'teacher' | 'student') => {
    return await signUp(email, password, fullName, role);
  };

  const handleSignOut = async () => {
    // Broadcast to other tabs before signing out
    if (channel && user) {
      channel.postMessage({
        type: 'SIGNED_OUT',
        userId: user.id,
      });
    }

    await signOut();
    setUser(null);
    setProfile(null);
    setSessionState(null);
    setCachedProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id);
    }
  };

  const setSession = async (session: Session | null) => {
    setSessionState(session);
    if (session) {
      setUser(session.user);
      if (session.user) {
        await loadProfile(session.user.id);
      }
    } else {
      setUser(null);
      setProfile(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        hasOtherSession,
        signIn: handleSignIn,
        signInWithGoogle: handleSignInWithGoogle,
        signUp: handleSignUp,
        signOut: handleSignOut,
        refreshProfile,
        setSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
