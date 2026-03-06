-- Migration: Add missing RLS policies
-- Run this against your existing Supabase database to fix:
-- 1. Students not appearing online in teacher dashboard (missing SELECT on profiles/enrollments)
-- 2. Student progress not saving (missing INSERT/UPDATE policies)
-- 3. Teacher CRUD operations failing silently (missing write policies)

-- Teachers can read enrolled student profiles (name, last_login, etc.)
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

-- Teachers can see who is enrolled in their classes
DROP POLICY IF EXISTS "Teachers can view own class enrollments" ON public.class_enrollments;
CREATE POLICY "Teachers can view own class enrollments" ON public.class_enrollments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = class_enrollments.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

-- Students can enroll themselves in classes
DROP POLICY IF EXISTS "Students can enroll in classes" ON public.class_enrollments;
CREATE POLICY "Students can enroll in classes" ON public.class_enrollments
  FOR INSERT WITH CHECK (student_id = auth.uid());

-- Teachers can create/update/delete their own classes
DROP POLICY IF EXISTS "Teachers can create classes" ON public.classes;
CREATE POLICY "Teachers can create classes" ON public.classes
  FOR INSERT WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can update own classes" ON public.classes;
CREATE POLICY "Teachers can update own classes" ON public.classes
  FOR UPDATE USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can delete own classes" ON public.classes;
CREATE POLICY "Teachers can delete own classes" ON public.classes
  FOR DELETE USING (teacher_id = auth.uid());

-- Teachers can create/update/delete their own assignments
DROP POLICY IF EXISTS "Teachers can create assignments" ON public.assignments;
CREATE POLICY "Teachers can create assignments" ON public.assignments
  FOR INSERT WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can update own assignments" ON public.assignments;
CREATE POLICY "Teachers can update own assignments" ON public.assignments
  FOR UPDATE USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can delete own assignments" ON public.assignments;
CREATE POLICY "Teachers can delete own assignments" ON public.assignments
  FOR DELETE USING (teacher_id = auth.uid());

-- Teachers can manage assignment-class links
DROP POLICY IF EXISTS "Teachers can manage assignment classes" ON public.assignment_classes;
CREATE POLICY "Teachers can manage assignment classes" ON public.assignment_classes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.assignments
      WHERE assignments.id = assignment_classes.assignment_id
      AND assignments.teacher_id = auth.uid()
    )
  );

-- Students can view assignment-class links for their enrolled classes
DROP POLICY IF EXISTS "Students can view assignment class links" ON public.assignment_classes;
CREATE POLICY "Students can view assignment class links" ON public.assignment_classes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.class_enrollments
      WHERE class_enrollments.class_id = assignment_classes.class_id
      AND class_enrollments.student_id = auth.uid()
    )
  );

-- Students can create and update their own progress
DROP POLICY IF EXISTS "Students can insert own progress" ON public.student_assignment_progress;
CREATE POLICY "Students can insert own progress" ON public.student_assignment_progress
  FOR INSERT WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can update own progress" ON public.student_assignment_progress;
CREATE POLICY "Students can update own progress" ON public.student_assignment_progress
  FOR UPDATE USING (student_id = auth.uid());

-- Teachers can insert initial progress records when creating assignments
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

-- Students can create and update their own word progress
DROP POLICY IF EXISTS "Students can insert own word progress" ON public.word_progress;
CREATE POLICY "Students can insert own word progress" ON public.word_progress
  FOR INSERT WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can update own word progress" ON public.word_progress;
CREATE POLICY "Students can update own word progress" ON public.word_progress
  FOR UPDATE USING (student_id = auth.uid());

-- Students can log their own learning activities
DROP POLICY IF EXISTS "Students can insert own activities" ON public.learning_activities;
CREATE POLICY "Students can insert own activities" ON public.learning_activities
  FOR INSERT WITH CHECK (student_id = auth.uid());

-- Teachers can manage assignment stories
DROP POLICY IF EXISTS "Teachers can manage assignment stories" ON public.assignment_stories;
CREATE POLICY "Teachers can manage assignment stories" ON public.assignment_stories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.assignments
      WHERE assignments.id = assignment_stories.assignment_id
      AND assignments.teacher_id = auth.uid()
    )
  );
