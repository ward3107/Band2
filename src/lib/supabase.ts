import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const baseConfig = {
  auth: {
    persistSession: true,
    detectSessionInUrl: false,
    flowType: "pkce" as const
  }
};

// One admin — Google OAuth
export const supabaseAdmin = createClient(URL, KEY, {
  auth: { ...baseConfig.auth, storageKey: "band2-admin-auth" }
});

// Many teachers — code login
export const supabaseTeacher = createClient(URL, KEY, {
  auth: { ...baseConfig.auth, storageKey: "band2-teacher-auth" }
});

// Many students — code login
export const supabaseStudent = createClient(URL, KEY, {
  auth: { ...baseConfig.auth, storageKey: "band2-student-auth" }
});

// Keep backwards compatible default export
export const supabase = supabaseTeacher;
export default supabase;

// Database types
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'teacher' | 'student';
  avatar_url: string | null;
  created_at: string;
  last_login: string | null;
  is_admin?: boolean;
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
  assignment_type: 'flashcards' | 'quiz' | 'both';
  allowed_modes?: string[];
  custom_words?: Array<{ word: string; translation: string }> | null;
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
  return await supabase.auth.signOut({ scope: 'local' });
}

export async function signInWithGoogle() {
  const redirectUrl = `${window.location.origin}/auth/callback`;

  const { data, error } = await supabaseAdmin.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  });

  return { data, error };
}

// Mode progress helper functions
export async function saveModeProgress(
  studentId: string,
  assignmentId: string,
  mode: 'flashcards' | 'quiz' | 'matching' | 'story' | 'spelling' | 'scramble' | 'fill-in-blank',
  wordsStudied: number,
  correctAnswers: number,
  completed: boolean
) {
  const { data: existing } = await supabase
    .from('student_mode_progress')
    .select('*')
    .eq('student_id', studentId)
    .eq('assignment_id', assignmentId)
    .eq('mode', mode)
    .maybeSingle();

  if (existing) {
    // Update existing record
    const { error } = await supabase
      .from('student_mode_progress')
      .update({
        words_studied: Math.max(existing.words_studied || 0, wordsStudied),
        correct_answers: Math.max(existing.correct_answers || 0, correctAnswers),
        completed: completed || existing.completed,
        last_activity: new Date().toISOString(),
      })
      .eq('id', existing.id);
    return { error };
  } else {
    // Insert new record
    const { error } = await supabase
      .from('student_mode_progress')
      .insert({
        student_id: studentId,
        assignment_id: assignmentId,
        mode,
        words_studied: wordsStudied,
        correct_answers: correctAnswers,
        completed,
        last_activity: new Date().toISOString(),
      });
    return { error };
  }
}
