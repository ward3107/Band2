import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storage: window.localStorage,
    storageKey: 'sb-pthhxqufzgbyzuucnfni-auth-token',
  },
  global: {
    headers: {
      'apikey': supabaseAnonKey,
    },
  },
});

// Database types
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'teacher' | 'student';
  avatar_url: string | null;
  created_at: string;
  last_login: string | null;
}

export interface Class {
  id: string;
  teacher_id: string;
  name: string;
  grade_level: string | null;
  class_code: string;
  created_at: string;
}

export interface Assignment {
  id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  word_ids: string[];
  total_words: number;
  deadline: string;
  created_at: string;
  updated_at: string;
}

export interface StudentAssignmentProgress {
  id: string;
  student_id: string;
  assignment_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  words_learned: number;
  quiz_score: number | null;
  quiz_taken_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  last_activity: string;
}

export interface ClassEnrollment {
  id: string;
  class_id: string;
  student_id: string;
  enrolled_at: string;
}

// Helper functions
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentProfile() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return data as Profile | null;
}

export async function signUp(email: string, password: string, fullName: string, role: 'teacher' | 'student') {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) return { error: error.message || 'Signup failed', data: null };

  // Create profile
  if (data.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: data.user.id,
        email: data.user.email!,
        full_name: fullName,
        role,
      });

    if (profileError) return { error: profileError.message || 'Failed to create profile', data: null };
  }

  return { error: null, data };
}

export async function signIn(email: string, password: string) {
  const result = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // Transform error to message string
  if (result.error) {
    return { ...result, error: result.error.message || 'Login failed' };
  }

  return result;
}

export async function signOut() {
  return await supabase.auth.signOut();
}

export async function signInWithGoogle() {
  // Use current origin for redirect (works for both localhost and production)
  const redirectUrl = `${window.location.origin}/auth/callback`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  return { data, error };
}
