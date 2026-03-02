'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, Profile, getCurrentProfile, signIn, signUp, signOut, signInWithGoogle } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  signUp: (email: string, password: string, fullName: string, role: 'teacher' | 'student') => Promise<any>;
  signOut: () => Promise<any>;
  refreshProfile: () => Promise<void>;
  setSession: (session: Session | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for session from OAuth callback in cookie
    const checkOAuthSession = () => {
      const sessionCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('supabase-session='));

      if (sessionCookie) {
        try {
          const sessionData = JSON.parse(
            decodeURIComponent(sessionCookie.split('=')[1])
          );
          // Set session in Supabase client
          if (sessionData.access_token) {
            supabase.auth.setSession({
              access_token: sessionData.access_token,
              refresh_token: sessionData.refresh_token,
            });
            // Clear the cookie
            document.cookie = 'supabase-session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          }
        } catch (e) {
          console.error('Failed to parse session cookie:', e);
        }
      }
    };

    // Check active sessions and set the user
    const initAuth = async () => {
      checkOAuthSession();

      const { data: { session } } = await supabase.auth.getSession();
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

      if (error) {
        console.error('Failed to load profile:', error);
      }
      setProfile(data);
    } catch (e) {
      console.error('Error loading profile:', e);
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
