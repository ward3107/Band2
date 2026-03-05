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
    // initAuth uses getSession() for a reliable, fast local-storage read on
    // every page load / hard-refresh — no network call needed.
    const initAuth = async () => {
      // Show cached profile immediately (0ms) so the UI unblocks instantly on
      // refresh/back-navigation, then validate from DB in background.
      try {
        const cached = sessionStorage.getItem('band2_profile');
        if (cached) {
          const cachedProfile = JSON.parse(cached) as Profile;
          setProfile(cachedProfile);
          setLoading(false); // unblock guards immediately
        }
      } catch {
        // Ignore sessionStorage errors (private browsing, quota, etc.)
      }

      const { data: { session } } = await supabase.auth.getSession();
      setSessionState(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadProfile(session.user.id);
      } else {
        sessionStorage.removeItem('band2_profile');
        setLoading(false);
      }
    };

    initAuth();

    // onAuthStateChange handles live auth events (sign-in, sign-out, token
    // refresh). INITIAL_SESSION is skipped here because initAuth already
    // handled it — this prevents the double loadProfile() call.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION') return;

      setSessionState(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string): Promise<Profile | null> => {
    let profileData: Profile | null = null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle(); // Use maybeSingle to avoid error if not found

      profileData = error ? null : data;
      setProfile(profileData);
      // Cache profile so next page load / refresh shows UI immediately
      if (profileData) {
        try { sessionStorage.setItem('band2_profile', JSON.stringify(profileData)); } catch { /* ignore */ }
      }
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
      const profile = await loadProfile(result.data.user.id);
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
    try { sessionStorage.removeItem('band2_profile'); } catch { /* ignore */ }
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
