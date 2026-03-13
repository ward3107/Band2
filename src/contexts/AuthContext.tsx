'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { supabase, supabaseAdmin, supabaseTeacher, supabaseStudent, Profile, signIn, signUp, signOut, signInWithGoogle } from '@/lib/supabase';
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
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signInWithGoogle: () => Promise<SignInWithGoogleResult>;
  signUp: (email: string, password: string, fullName: string, role: 'teacher' | 'student') => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  refreshProfile: (fallbackUserId?: string) => Promise<void>;
  setSession: (session: Session | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isDev = process.env.NODE_ENV === 'development';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSessionState] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeClient, setActiveClient] = useState<'admin' | 'teacher' | 'student' | null>(null);

  // Ref to track the active client immediately (state updates are async)
  const activeClientRef = useRef<'admin' | 'teacher' | 'student' | null>(null);
  // Ref to track the current user — lets refreshProfile work even when called
  // from a stale closure (e.g. the auth/callback useEffect) where the user
  // state captured at effect-creation time is still null.
  const userRef = useRef<User | null>(null);

  useEffect(() => {
    // Safety timeout: if auth never resolves (e.g. Supabase unreachable),
    // stop loading after 10 seconds so the UI doesn't hang forever.
    const safetyTimeout = setTimeout(() => {
      setLoading((prev) => {
        if (prev) console.warn('Auth loading timed out after 10s');
        return false;
      });
    }, 10_000);

    // Track which client has the active session (admin has priority)
    // Use a ref for the callback to access the current value
    let currentActiveClient: 'admin' | 'teacher' | 'student' | null = activeClient;

    // Initialize: check all clients for active sessions and determine which one to use
    const initializeAuth = async () => {
      try {
        // Check all three clients for active sessions
        const { data: { session: adminSession } } = await supabaseAdmin.auth.getSession();
        const { data: { session: studentSession } } = await supabaseStudent.auth.getSession();
        const { data: { session: teacherSession } } = await supabase.auth.getSession(); // Default is teacher

        isDev && console.log('Auth init - admin:', !!adminSession?.user, 'student:', !!studentSession?.user, 'teacher:', !!teacherSession?.user);

        // Priority: admin > teacher > student
        let activeSession: Session | null = null;
        let newActiveClient: 'admin' | 'teacher' | 'student' | null = null;

        if (adminSession?.user) {
          activeSession = adminSession;
          newActiveClient = 'admin';
          isDev && console.log('Using admin session:', adminSession.user.email);
        } else if (teacherSession?.user) {
          activeSession = teacherSession;
          newActiveClient = 'teacher';
          isDev && console.log('Using teacher session:', teacherSession.user.email);
        } else if (studentSession?.user) {
          activeSession = studentSession;
          newActiveClient = 'student';
          isDev && console.log('Using student session:', studentSession.user.email);
        } else {
          isDev && console.log('No session found in any client');
        }

        // Update the active client state
        setActiveClient(newActiveClient);
        activeClientRef.current = newActiveClient;
        currentActiveClient = newActiveClient;

        // Set the state with the active session
        if (activeSession?.user) {
          setSessionState(activeSession);
          userRef.current = activeSession.user;
          setUser(activeSession.user);
          setCachedProfile(null);
          loadProfile(activeSession.user.id);
        } else {
          setSessionState(null);
          userRef.current = null;
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error during auth initialization:', err);
        setLoading(false);
      }
    };

    // Start initialization
    initializeAuth();

    // Helper to determine if a client should update state
    // Admin always takes priority, then teacher, then student
    const shouldUpdateState = (client: 'admin' | 'teacher' | 'student', hasSession: boolean): boolean => {
      if (!hasSession) return currentActiveClient === client; // Only clear if this was the active client
      if (client === 'admin') return true; // Admin always wins
      if (client === 'teacher') return currentActiveClient !== 'admin'; // Teacher wins unless admin is active
      if (client === 'student') return currentActiveClient === null; // Student only wins if no one else is active
      return false;
    };

    // Set up listeners for ALL THREE clients
    const { data: { subscription: adminSub } } = supabaseAdmin.auth.onAuthStateChange((event, session) => {
      isDev && console.log('Admin auth state changed:', event, 'user:', session?.user?.email || 'none');
      const hasUser = !!session?.user;
      if (shouldUpdateState('admin', hasUser)) {
        const newActiveClient = hasUser ? 'admin' : null;
        setActiveClient(newActiveClient);
        activeClientRef.current = newActiveClient;
        currentActiveClient = newActiveClient;
        setSessionState(session);
        userRef.current = session?.user ?? null;
        setUser(session?.user ?? null);
        if (session?.user) {
          if (event === 'SIGNED_IN') setCachedProfile(null);
          loadProfile(session.user.id);
        } else {
          setProfile(null);
          setCachedProfile(null);
          setLoading(false);
        }
      }
      clearTimeout(safetyTimeout);
    });

    const { data: { subscription: teacherSub } } = supabase.auth.onAuthStateChange((event, session) => {
      isDev && console.log('Teacher auth state changed:', event, 'user:', session?.user?.email || 'none');
      const hasUser = !!session?.user;
      if (shouldUpdateState('teacher', hasUser)) {
        const newActiveClient = hasUser ? 'teacher' : null;
        setActiveClient(newActiveClient);
        activeClientRef.current = newActiveClient;
        currentActiveClient = newActiveClient;
        setSessionState(session);
        userRef.current = session?.user ?? null;
        setUser(session?.user ?? null);
        if (session?.user) {
          if (event === 'SIGNED_IN') setCachedProfile(null);
          loadProfile(session.user.id);
        } else {
          setProfile(null);
          setCachedProfile(null);
          setLoading(false);
        }
      }
      clearTimeout(safetyTimeout);
    });

    const { data: { subscription: studentSub } } = supabaseStudent.auth.onAuthStateChange((event, session) => {
      isDev && console.log('Student auth state changed:', event, 'user:', session?.user?.email || 'none');
      const hasUser = !!session?.user;
      if (shouldUpdateState('student', hasUser)) {
        const newActiveClient = hasUser ? 'student' : null;
        setActiveClient(newActiveClient);
        activeClientRef.current = newActiveClient;
        currentActiveClient = newActiveClient;
        setSessionState(session);
        userRef.current = session?.user ?? null;
        setUser(session?.user ?? null);
        if (session?.user) {
          if (event === 'SIGNED_IN') setCachedProfile(null);
          loadProfile(session.user.id);
        } else {
          setProfile(null);
          setCachedProfile(null);
          setLoading(false);
        }
      }
      clearTimeout(safetyTimeout);
    });

    return () => {
      clearTimeout(safetyTimeout);
      adminSub.unsubscribe();
      teacherSub.unsubscribe();
      studentSub.unsubscribe();
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

    // Use the ref value for immediate access (state updates are async)
    // Detect which client has this user's session if not already set
    let client = supabase; // default (teacher)
    let detectedClient = activeClientRef.current;

    if (!detectedClient) {
      // One-time detection: check all clients for this user's session
      // We DO NOT setActiveClient here to avoid infinite loop
      // Just detect and use the right client for this query
      const { data: { session: adminSess } } = await supabaseAdmin.auth.getSession();
      const { data: { session: studentSess } } = await supabaseStudent.auth.getSession();
      const { data: { session: teacherSess } } = await supabase.auth.getSession();

      if (adminSess?.user?.id === userId) {
        client = supabaseAdmin;
        detectedClient = 'admin';
      } else if (teacherSess?.user?.id === userId) {
        client = supabaseTeacher;
        detectedClient = 'teacher';
      } else if (studentSess?.user?.id === userId) {
        client = supabaseStudent;
        detectedClient = 'student';
      }
      isDev && console.log('One-time client detection for profile load:', detectedClient || 'default');
    } else {
      // Use the already-detected client from ref
      if (detectedClient === 'student') {
        client = supabaseStudent;
      } else if (detectedClient === 'teacher') {
        client = supabaseTeacher;
      } else if (detectedClient === 'admin') {
        client = supabaseAdmin;
      }
    }

    isDev && console.log('Loading profile using client:', detectedClient || 'default');

    let profileData: Profile | null = null;
    try {
      // Race the profile query against an 8s timeout to prevent hanging
      const query = client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      isDev && console.log('Executing profile query for user:', userId);

      let timeoutId: ReturnType<typeof setTimeout>;
      const result = await Promise.race([
        query.then(r => { clearTimeout(timeoutId); return r; }),
        new Promise<{ data: null; error: { message: string } }>((resolve) => {
          timeoutId = setTimeout(() => {
            console.error('Profile query timed out after 8s!');
            resolve({ data: null, error: { message: 'Profile load timed out' } });
          }, 8_000);
        }),
      ]);

      isDev && console.log('Profile query result:', result);

      profileData = result.error ? null : result.data as Profile | null;
      isDev && console.log('Profile data after query:', profileData);

      if (result.error) {
        console.error('Profile query error:', result.error);
      }

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

      // NOTE: We NO LONGER sync sessions between clients
      // Each user type (admin, teacher, student) has their own client
      // The AuthContext watches all three and uses the active one

      // Set user and session immediately so guards don't see a null user
      // before onAuthStateChange fires asynchronously.
      userRef.current = result.data.user;
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
    // Sign out from all clients to ensure complete logout
    await Promise.all([
      signOut(), // Default client
      supabaseAdmin.auth.signOut({ scope: 'local' }),
      supabaseStudent.auth.signOut({ scope: 'local' }),
    ]);
    userRef.current = null;
    setUser(null);
    setProfile(null);
    setSessionState(null);
    setCachedProfile(null);
  };

  const refreshProfile = async (fallbackUserId?: string) => {
    // Use userRef instead of the `user` state variable so this function works
    // correctly even when called from a stale closure (e.g. the auth/callback
    // useEffect) where the captured `user` was still null.
    // fallbackUserId is used in the PKCE recovery path where SIGNED_IN never
    // fires and userRef.current is still null, but the caller has the userId
    // from the session returned by exchangeCodeForSession / getSession.
    const userId = userRef.current?.id ?? fallbackUserId;
    if (userId) {
      setCachedProfile(null);
      await loadProfile(userId);
    }
  };

  const setSession = async (session: Session | null) => {
    setSessionState(session);
    if (session) {
      userRef.current = session.user;
      setUser(session.user);
      if (session.user) {
        await loadProfile(session.user.id);
      }
    } else {
      userRef.current = null;
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
