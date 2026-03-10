import { createClient, SupabaseClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const baseConfig = {
  auth: {
    persistSession: true,
    detectSessionInUrl: false,
    flowType: "pkce" as const
  }
};

// THREE SEPARATE CLIENTS with different storage keys
// This allows multiple users to be logged in simultaneously (admin + teacher + student)
export const supabaseAdmin = createClient(URL, KEY, {
  auth: { ...baseConfig.auth, storageKey: "band2-admin-auth" }
});

export const supabaseTeacher = createClient(URL, KEY, {
  auth: { ...baseConfig.auth, storageKey: "band2-teacher-auth" }
});

export const supabaseStudent = createClient(URL, KEY, {
  auth: { ...baseConfig.auth, storageKey: "band2-student-auth" }
});

// Default export for backwards compatibility
// Use supabaseTeacher as default since it's the most common use case
export const supabase = supabaseTeacher;
export default supabaseTeacher;

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

/**
 * Get the appropriate client based on email domain
 */
export function getClientForEmail(email: string): SupabaseClient {
  if (email.endsWith('@teacher.band2.app')) return supabaseTeacher;
  if (email.endsWith('@student.band2.app')) return supabaseStudent;
  return supabaseAdmin; // Google OAuth / admin
}

/**
 * Get the appropriate client based on user role
 */
export function getClientForRole(role: 'admin' | 'teacher' | 'student'): SupabaseClient {
  switch (role) {
    case 'admin': return supabaseAdmin;
    case 'teacher': return supabaseTeacher;
    case 'student': return supabaseStudent;
    default: return supabaseTeacher;
  }
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

/**
 * Check all three clients for an active session
 * Returns the first active session found (priority: admin > teacher > student)
 */
export async function getActiveSession(): Promise<{ session: any; client: SupabaseClient; role: string } | null> {
  // Check admin first
  const { data: { session: adminSession } } = await supabaseAdmin.auth.getSession();
  if (adminSession) {
    return { session: adminSession, client: supabaseAdmin, role: 'admin' };
  }

  // Check teacher
  const { data: { session: teacherSession } } = await supabaseTeacher.auth.getSession();
  if (teacherSession) {
    return { session: teacherSession, client: supabaseTeacher, role: 'teacher' };
  }

  // Check student
  const { data: { session: studentSession } } = await supabaseStudent.auth.getSession();
  if (studentSession) {
    return { session: studentSession, client: supabaseStudent, role: 'student' };
  }

  return null;
}

export async function signUp(email: string, password: string, fullName: string, role: 'teacher' | 'student') {
  const client = getClientForEmail(email);
  const { data, error } = await client.auth.signUp({
    email,
    password,
  });

  if (error) return { error: error.message || 'Signup failed', data: null };

  // Create profile
  if (data.user) {
    const { error: profileError } = await client
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
  // Pick the right client based on email domain
  const client = getClientForEmail(email);
  const result = await client.auth.signInWithPassword({
    email,
    password,
  });

  // Transform error to message string
  if (result.error) {
    return { ...result, error: result.error.message || 'Login failed' };
  }

  return result;
}

/**
 * Sign out from a specific client (by role)
 */
export async function signOutFromRole(role: 'admin' | 'teacher' | 'student') {
  const client = getClientForRole(role);
  return await client.auth.signOut({ scope: 'local' });
}

/**
 * Sign out from the default client (backwards compatible)
 */
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
