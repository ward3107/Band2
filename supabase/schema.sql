-- ============================================
-- VOCABULARY APP - TEACHER/STUDENT SYSTEM
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE (extends auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'student')),
  avatar_url TEXT,
  student_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- ============================================
-- CLASSES TABLE (created by teachers)
-- ============================================
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  grade_level TEXT, -- e.g., "7", "8", "9"
  class_code TEXT UNIQUE NOT NULL, -- For students to join
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CLASS ENROLLMENTS (students in classes)
-- ============================================
CREATE TABLE IF NOT EXISTS public.class_enrollments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, student_id)
);

-- ============================================
-- ASSIGNMENTS (created by teachers)
-- ============================================
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  word_ids TEXT[] NOT NULL, -- Array of vocabulary word IDs
  total_words INT NOT NULL,
  deadline TIMESTAMPTZ NOT NULL,
  assignment_type TEXT DEFAULT 'both',
  allowed_modes TEXT[], -- Which study modes are enabled for students
  custom_words JSONB, -- Custom words added by teacher: [{word, translation}]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ASSIGNMENT CLASS LINK (which classes get which assignments)
-- ============================================
CREATE TABLE IF NOT EXISTS public.assignment_classes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE NOT NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(assignment_id, class_id)
);

-- ============================================
-- STUDENT ASSIGNMENT PROGRESS
-- ============================================
CREATE TABLE IF NOT EXISTS public.student_assignment_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  words_learned INT DEFAULT 0,
  quiz_score INT, -- NULL until quiz taken
  quiz_taken_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, assignment_id)
);

-- ============================================
-- WORD PROGRESS (per word, per student)
-- ============================================
CREATE TABLE IF NOT EXISTS public.word_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  word_id TEXT NOT NULL, -- Vocabulary word ID
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'learning', 'practicing', 'known', 'mastered')),
  attempts INT DEFAULT 0,
  correct INT DEFAULT 0,
  last_reviewed TIMESTAMPTZ,
  next_review TIMESTAMPTZ,
  ease_factor DECIMAL DEFAULT 2.5,
  interval INT DEFAULT 0,
  UNIQUE(student_id, word_id, assignment_id)
);

-- ============================================
-- LEARNING ACTIVITIES (track what students do)
-- ============================================
CREATE TABLE IF NOT EXISTS public.learning_activities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('story', 'listening', 'sentence_builder', 'speed_challenge', 'quiz', 'flashcard')),
  word_id TEXT,
  correct BOOLEAN,
  time_spent_seconds INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AI-GENERATED STORIES (cache generated stories)
-- ============================================
CREATE TABLE IF NOT EXISTS public.assignment_stories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE NOT NULL,
  story_text TEXT NOT NULL,
  highlighted_words JSONB, -- Store which words are highlighted where
  fill_in_blanks_version TEXT, -- Story with blanks for exercise
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON public.classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_code ON public.classes(class_code);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON public.class_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class ON public.class_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_teacher ON public.assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_assignment_classes_class ON public.assignment_classes(class_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_student ON public.student_assignment_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_assignment ON public.student_assignment_progress(assignment_id);
CREATE INDEX IF NOT EXISTS idx_word_progress_student ON public.word_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_activities_student ON public.learning_activities(student_id);

-- ============================================
-- RLS (ROW LEVEL SECURITY) POLICIES
-- Drop before create so this file can be re-run safely.
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_assignment_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.word_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_stories ENABLE ROW LEVEL SECURITY;

-- Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Teachers need to see enrolled students' profiles (name, last_login, etc.)
DROP POLICY IF EXISTS "Teachers can view enrolled student profiles" ON public.profiles;
CREATE POLICY "Teachers can view enrolled student profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.class_enrollments
      JOIN public.classes ON classes.id = class_enrollments.class_id
      WHERE class_enrollments.student_id = profiles.id
      AND classes.teacher_id = auth.uid()
    )
  );

-- Classes
DROP POLICY IF EXISTS "Teachers can view own classes" ON public.classes;
CREATE POLICY "Teachers can view own classes" ON public.classes
  FOR SELECT USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can create classes" ON public.classes;
CREATE POLICY "Teachers can create classes" ON public.classes
  FOR INSERT WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can update own classes" ON public.classes;
CREATE POLICY "Teachers can update own classes" ON public.classes
  FOR UPDATE USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can delete own classes" ON public.classes;
CREATE POLICY "Teachers can delete own classes" ON public.classes
  FOR DELETE USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Students can view enrolled classes" ON public.classes;
CREATE POLICY "Students can view enrolled classes" ON public.classes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.class_enrollments WHERE class_id = classes.id AND student_id = auth.uid())
  );

-- Class enrollments
DROP POLICY IF EXISTS "Students can view own enrollments" ON public.class_enrollments;
CREATE POLICY "Students can view own enrollments" ON public.class_enrollments
  FOR SELECT USING (student_id = auth.uid());

-- Students can enroll themselves in classes
DROP POLICY IF EXISTS "Students can enroll in classes" ON public.class_enrollments;
CREATE POLICY "Students can enroll in classes" ON public.class_enrollments
  FOR INSERT WITH CHECK (student_id = auth.uid());

-- Teachers need to see who is enrolled in their classes
DROP POLICY IF EXISTS "Teachers can view own class enrollments" ON public.class_enrollments;
CREATE POLICY "Teachers can view own class enrollments" ON public.class_enrollments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = class_enrollments.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

-- Assignments
DROP POLICY IF EXISTS "Teachers can view own assignments" ON public.assignments;
CREATE POLICY "Teachers can view own assignments" ON public.assignments
  FOR SELECT USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can create assignments" ON public.assignments;
CREATE POLICY "Teachers can create assignments" ON public.assignments
  FOR INSERT WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can update own assignments" ON public.assignments;
CREATE POLICY "Teachers can update own assignments" ON public.assignments
  FOR UPDATE USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can delete own assignments" ON public.assignments;
CREATE POLICY "Teachers can delete own assignments" ON public.assignments
  FOR DELETE USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Students can view class assignments" ON public.assignments;
CREATE POLICY "Students can view class assignments" ON public.assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.assignment_classes
      JOIN public.class_enrollments ON assignment_classes.class_id = class_enrollments.class_id
      WHERE assignment_classes.assignment_id = assignments.id
      AND class_enrollments.student_id = auth.uid()
    )
  );

-- Assignment-class links
DROP POLICY IF EXISTS "Teachers can manage assignment classes" ON public.assignment_classes;
CREATE POLICY "Teachers can manage assignment classes" ON public.assignment_classes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.assignments
      WHERE assignments.id = assignment_classes.assignment_id
      AND assignments.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Students can view assignment class links" ON public.assignment_classes;
CREATE POLICY "Students can view assignment class links" ON public.assignment_classes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.class_enrollments
      WHERE class_enrollments.class_id = assignment_classes.class_id
      AND class_enrollments.student_id = auth.uid()
    )
  );

-- Student progress
DROP POLICY IF EXISTS "Students can view own progress" ON public.student_assignment_progress;
CREATE POLICY "Students can view own progress" ON public.student_assignment_progress
  FOR SELECT USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can insert own progress" ON public.student_assignment_progress;
CREATE POLICY "Students can insert own progress" ON public.student_assignment_progress
  FOR INSERT WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can update own progress" ON public.student_assignment_progress;
CREATE POLICY "Students can update own progress" ON public.student_assignment_progress
  FOR UPDATE USING (student_id = auth.uid());

-- Teachers can also insert initial progress records when creating assignments
DROP POLICY IF EXISTS "Teachers can insert student progress" ON public.student_assignment_progress;
CREATE POLICY "Teachers can insert student progress" ON public.student_assignment_progress
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assignments
      WHERE assignments.id = assignment_id
      AND assignments.teacher_id = auth.uid()
    )
  );

-- Teachers can delete progress when deleting assignments
DROP POLICY IF EXISTS "Teachers can delete student progress" ON public.student_assignment_progress;
CREATE POLICY "Teachers can delete student progress" ON public.student_assignment_progress
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.assignments
      WHERE assignments.id = student_assignment_progress.assignment_id
      AND assignments.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Teachers can view student progress" ON public.student_assignment_progress;
CREATE POLICY "Teachers can view student progress" ON public.student_assignment_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.assignments
      JOIN public.assignment_classes ON assignments.id = assignment_classes.assignment_id
      JOIN public.class_enrollments ON assignment_classes.class_id = class_enrollments.class_id
      WHERE assignments.id = student_assignment_progress.assignment_id
      AND assignments.teacher_id = auth.uid()
    )
  );

-- Word progress
DROP POLICY IF EXISTS "Students can view own word progress" ON public.word_progress;
CREATE POLICY "Students can view own word progress" ON public.word_progress
  FOR SELECT USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can insert own word progress" ON public.word_progress;
CREATE POLICY "Students can insert own word progress" ON public.word_progress
  FOR INSERT WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can update own word progress" ON public.word_progress;
CREATE POLICY "Students can update own word progress" ON public.word_progress
  FOR UPDATE USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can view student word progress" ON public.word_progress;
CREATE POLICY "Teachers can view student word progress" ON public.word_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.assignments
      WHERE assignments.id = word_progress.assignment_id
      AND assignments.teacher_id = auth.uid()
    )
  );

-- Learning activities
DROP POLICY IF EXISTS "Students can view own activities" ON public.learning_activities;
CREATE POLICY "Students can view own activities" ON public.learning_activities
  FOR SELECT USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can insert own activities" ON public.learning_activities;
CREATE POLICY "Students can insert own activities" ON public.learning_activities
  FOR INSERT WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can view student activities" ON public.learning_activities;
CREATE POLICY "Teachers can view student activities" ON public.learning_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.assignments
      WHERE assignments.id = learning_activities.assignment_id
      AND assignments.teacher_id = auth.uid()
    )
  );

-- Assignment stories
DROP POLICY IF EXISTS "Teachers can manage assignment stories" ON public.assignment_stories;
CREATE POLICY "Teachers can manage assignment stories" ON public.assignment_stories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.assignments
      WHERE assignments.id = assignment_stories.assignment_id
      AND assignments.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can view assignment stories" ON public.assignment_stories;
CREATE POLICY "Users can view assignment stories" ON public.assignment_stories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.assignments
      WHERE assignments.id = assignment_stories.assignment_id
      AND (assignments.teacher_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.assignment_classes
        JOIN public.class_enrollments ON assignment_classes.class_id = class_enrollments.class_id
        WHERE assignment_classes.assignment_id = assignments.id
        AND class_enrollments.student_id = auth.uid()
      ))
    )
  );

-- ============================================
-- ADMIN COLUMNS & TABLES
-- ============================================

-- Add is_admin column to profiles (idempotent)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Add student_code column to profiles (idempotent)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS student_code TEXT UNIQUE;

-- Approved teachers allowlist (used during Google OAuth sign-up)
CREATE TABLE IF NOT EXISTS public.approved_teachers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  added_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add is_admin to approved_teachers if missing (idempotent)
ALTER TABLE public.approved_teachers ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_approved_teachers_email ON public.approved_teachers(email);

ALTER TABLE public.approved_teachers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage approved teachers" ON public.approved_teachers;
CREATE POLICY "Admins can manage approved teachers" ON public.approved_teachers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Allow any authenticated user to check whether their own email is approved.
-- This is needed during the Google OAuth callback: the user has no profile yet
-- so the admin policy above blocks them. This narrow SELECT policy lets the
-- callback look up only the row that matches the caller's own email.
DROP POLICY IF EXISTS "Users can check own approval status" ON public.approved_teachers;
CREATE POLICY "Users can check own approval status" ON public.approved_teachers
  FOR SELECT USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- ============================================
-- RPC: is_approved_teacher
-- ============================================
-- Returns the approved_teachers row for the given email, or empty result if not found.
-- SECURITY DEFINER so it bypasses RLS — callers only get data for the email they pass.
CREATE OR REPLACE FUNCTION public.is_approved_teacher(check_email TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  is_admin BOOLEAN,
  added_by UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, email, full_name, is_admin, added_by, created_at
  FROM public.approved_teachers
  WHERE approved_teachers.email = check_email
  LIMIT 1;
$$;

-- ============================================
-- STORAGE BUCKETS (optional, for avatars)
-- ============================================
-- Insert storage bucket policies if you want to store avatars
