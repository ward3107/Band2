-- ============================================================
-- COMPLETE RLS FIX - Run this entire file in Supabase SQL Editor
-- This consolidates all required INSERT/UPDATE/DELETE policies
-- ============================================================

-- ============================================================
-- PROFILES
-- ============================================================
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable select for profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for profiles" ON public.profiles;

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Teachers can read profiles of students in their classes
CREATE POLICY "Teachers can read student profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.class_enrollments ce
      JOIN public.classes c ON ce.class_id = c.id
      WHERE ce.student_id = profiles.id
      AND c.teacher_id = auth.uid()
    )
  );

-- Users can create their own profile on first login
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- CLASSES
-- ============================================================
DROP POLICY IF EXISTS "Teachers can view own classes" ON public.classes;
DROP POLICY IF EXISTS "Students can view enrolled classes" ON public.classes;
DROP POLICY IF EXISTS "Enable insert for teachers" ON public.classes;
DROP POLICY IF EXISTS "Enable select for teachers" ON public.classes;
DROP POLICY IF EXISTS "Enable update for teachers" ON public.classes;
DROP POLICY IF EXISTS "Enable delete for teachers" ON public.classes;
DROP POLICY IF EXISTS "Students can find class by code" ON public.classes;

-- Teachers manage their own classes
CREATE POLICY "Teachers can read own classes" ON public.classes
  FOR SELECT TO authenticated
  USING (auth.uid()::text = teacher_id::text);

CREATE POLICY "Teachers can create classes" ON public.classes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = teacher_id::text);

CREATE POLICY "Teachers can update own classes" ON public.classes
  FOR UPDATE TO authenticated
  USING (auth.uid()::text = teacher_id::text)
  WITH CHECK (auth.uid()::text = teacher_id::text);

CREATE POLICY "Teachers can delete own classes" ON public.classes
  FOR DELETE TO authenticated
  USING (auth.uid()::text = teacher_id::text);

-- Students can view classes they're enrolled in
CREATE POLICY "Students can view enrolled classes" ON public.classes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.class_enrollments
      WHERE class_id = classes.id AND student_id = auth.uid()
    )
  );

-- Any authenticated user can look up a class by code (needed to join)
CREATE POLICY "Authenticated users can find class by code" ON public.classes
  FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- CLASS ENROLLMENTS
-- ============================================================
DROP POLICY IF EXISTS "Students can view own enrollments" ON public.class_enrollments;
DROP POLICY IF EXISTS "Enable insert for students on enrollments" ON public.class_enrollments;
DROP POLICY IF EXISTS "Enable select for teachers on enrollments" ON public.class_enrollments;
DROP POLICY IF EXISTS "Enable select for students on enrollments" ON public.class_enrollments;

-- Students can enroll themselves
CREATE POLICY "Students can enroll" ON public.class_enrollments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = student_id::text);

-- Students can view their own enrollments
CREATE POLICY "Students can view own enrollments" ON public.class_enrollments
  FOR SELECT TO authenticated
  USING (auth.uid()::text = student_id::text);

-- Teachers can view enrollments for their classes
CREATE POLICY "Teachers can view class enrollments" ON public.class_enrollments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = class_enrollments.class_id
      AND classes.teacher_id::text = auth.uid()::text
    )
  );

-- Teachers can remove students from their classes
CREATE POLICY "Teachers can remove enrollments" ON public.class_enrollments
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = class_enrollments.class_id
      AND classes.teacher_id::text = auth.uid()::text
    )
  );

-- ============================================================
-- ASSIGNMENTS
-- ============================================================
DROP POLICY IF EXISTS "Teachers can view own assignments" ON public.assignments;
DROP POLICY IF EXISTS "Students can view class assignments" ON public.assignments;
DROP POLICY IF EXISTS "Enable insert for teachers" ON public.assignments;
DROP POLICY IF EXISTS "Enable select for teachers" ON public.assignments;
DROP POLICY IF EXISTS "Enable update for teachers" ON public.assignments;
DROP POLICY IF EXISTS "Enable delete for teachers" ON public.assignments;

-- Teachers manage their own assignments
CREATE POLICY "Teachers can read own assignments" ON public.assignments
  FOR SELECT TO authenticated
  USING (auth.uid()::text = teacher_id::text);

CREATE POLICY "Teachers can create assignments" ON public.assignments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = teacher_id::text);

CREATE POLICY "Teachers can update own assignments" ON public.assignments
  FOR UPDATE TO authenticated
  USING (auth.uid()::text = teacher_id::text)
  WITH CHECK (auth.uid()::text = teacher_id::text);

CREATE POLICY "Teachers can delete own assignments" ON public.assignments
  FOR DELETE TO authenticated
  USING (auth.uid()::text = teacher_id::text);

-- Students can view assignments for their classes
CREATE POLICY "Students can view class assignments" ON public.assignments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assignment_classes ac
      JOIN public.class_enrollments ce ON ac.class_id = ce.class_id
      WHERE ac.assignment_id = assignments.id
      AND ce.student_id = auth.uid()
    )
  );

-- ============================================================
-- ASSIGNMENT_CLASSES (linking table)
-- ============================================================
DROP POLICY IF EXISTS "Enable insert for teachers on assignment_classes" ON public.assignment_classes;
DROP POLICY IF EXISTS "Enable select for assignment_classes" ON public.assignment_classes;

CREATE POLICY "Teachers can link assignments to classes" ON public.assignment_classes
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assignments
      WHERE assignments.id = assignment_id
      AND assignments.teacher_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Teachers can view assignment-class links" ON public.assignment_classes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assignments
      WHERE assignments.id = assignment_id
      AND assignments.teacher_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Students can view assignment-class links" ON public.assignment_classes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.class_enrollments
      WHERE class_enrollments.class_id = assignment_classes.class_id
      AND class_enrollments.student_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can delete assignment-class links" ON public.assignment_classes
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assignments
      WHERE assignments.id = assignment_id
      AND assignments.teacher_id::text = auth.uid()::text
    )
  );

-- ============================================================
-- STUDENT ASSIGNMENT PROGRESS
-- ============================================================
DROP POLICY IF EXISTS "Students can view own progress" ON public.student_assignment_progress;
DROP POLICY IF EXISTS "Teachers can view student progress" ON public.student_assignment_progress;

CREATE POLICY "Students can view own progress" ON public.student_assignment_progress
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Students can insert own progress" ON public.student_assignment_progress
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update own progress" ON public.student_assignment_progress
  FOR UPDATE TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Teachers can insert progress records when creating assignments
CREATE POLICY "Teachers can insert student progress" ON public.student_assignment_progress
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assignments
      WHERE assignments.id = assignment_id
      AND assignments.teacher_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Teachers can view student progress" ON public.student_assignment_progress
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assignments
      WHERE assignments.id = assignment_id
      AND assignments.teacher_id::text = auth.uid()::text
    )
  );

-- ============================================================
-- WORD PROGRESS
-- ============================================================
DROP POLICY IF EXISTS "Students can view own word progress" ON public.word_progress;
DROP POLICY IF EXISTS "Teachers can view student word progress" ON public.word_progress;

CREATE POLICY "Students can view own word progress" ON public.word_progress
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Students can insert word progress" ON public.word_progress
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update word progress" ON public.word_progress
  FOR UPDATE TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Teachers can view student word progress" ON public.word_progress
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assignments
      WHERE assignments.id = word_progress.assignment_id
      AND assignments.teacher_id::text = auth.uid()::text
    )
  );

-- ============================================================
-- LEARNING ACTIVITIES
-- ============================================================
DROP POLICY IF EXISTS "Students can view own activities" ON public.learning_activities;
DROP POLICY IF EXISTS "Teachers can view student activities" ON public.learning_activities;

CREATE POLICY "Students can view own activities" ON public.learning_activities
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Students can insert activities" ON public.learning_activities
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Teachers can view student activities" ON public.learning_activities
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assignments
      WHERE assignments.id = learning_activities.assignment_id
      AND assignments.teacher_id::text = auth.uid()::text
    )
  );

-- ============================================================
-- ASSIGNMENT STORIES
-- ============================================================
DROP POLICY IF EXISTS "Users can view assignment stories" ON public.assignment_stories;

CREATE POLICY "Teachers can manage stories" ON public.assignment_stories
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assignments
      WHERE assignments.id = assignment_stories.assignment_id
      AND assignments.teacher_id::text = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assignments
      WHERE assignments.id = assignment_stories.assignment_id
      AND assignments.teacher_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Students can view stories for their assignments" ON public.assignment_stories
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assignment_classes ac
      JOIN public.class_enrollments ce ON ac.class_id = ce.class_id
      WHERE ac.assignment_id = assignment_stories.assignment_id
      AND ce.student_id = auth.uid()
    )
  );

-- ============================================================
-- APPROVED TEACHERS (was missing entirely)
-- ============================================================
ALTER TABLE IF EXISTS public.approved_teachers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins only read" ON public.approved_teachers;
DROP POLICY IF EXISTS "Admins only insert" ON public.approved_teachers;
DROP POLICY IF EXISTS "Admins only delete" ON public.approved_teachers;
DROP POLICY IF EXISTS "Service role full access" ON public.approved_teachers;

CREATE POLICY "Admins can read approved teachers" ON public.approved_teachers
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can add approved teachers" ON public.approved_teachers
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can remove approved teachers" ON public.approved_teachers
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Auth callback needs to check approved_teachers without being admin yet
-- Allow authenticated users to read (check) if their email is approved
CREATE POLICY "Users can check own approval status" ON public.approved_teachers
  FOR SELECT TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));
