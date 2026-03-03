'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, Profile, getCurrentProfile, signIn, signUp, signOut, signInWithGoogle } from '@/lib/supabase';
import { User, Session, AuthError } from '@supabase/supabase-js';

interface SignInResult {
  data: { user: User | null; session: Session | null } | null;
  error: string | null;
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
  setSession: (session: Session | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSessionState] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and set the user
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSessionState(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for changes on auth state
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
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

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, is_admin')
        .eq('id', userId)
        .maybeSingle(); // Use maybeSingle to avoid error if not found

      setProfile(error ? null : data);
    } catch {
      setProfile(null);
    }
    setLoading(false);
  };

  const handleSignIn = async (email: string, password: string) => {
    const result = await signIn(email, password);
    if (result.data?.user) {
      await loadProfile(result.data.user.id);
    }
    return result;
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
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id);
    }
  };

  const setSession = (session: Session | null) => {
    if (session) {
      setUser(session.user);
      if (session.user) {
        loadProfile(session.user.id);
      }
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
