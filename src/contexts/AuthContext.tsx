'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, Profile, getCurrentProfile, signIn, signUp, signOut, signInWithGoogle } from '@/lib/supabase';
import { User, Session, AuthError } from '@supabase/supabase-js';

interface SignInResult {
  data: { user: User | null; session: Session | null } | null;
  error: string | null;
  profile?: Profile | null;
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
    const result = await signIn(email, password);
    if (result.data?.user) {
      // Set user and session immediately so guards don't see a null user
      // before onAuthStateChange fires asynchronously.
      setUser(result.data.user);
      setSessionState(result.data.session);
      // Clear stale profile cache before loading fresh data
      setCachedProfile(null);
      const profile = await loadProfile(result.data.user.id);
      // Update last_login timestamp (fire-and-forget, swallow errors)
      void supabase.from('profiles').update({ last_login: new Date().toISOString() }).eq('id', result.data.user.id);
      return { ...result, profile };
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
