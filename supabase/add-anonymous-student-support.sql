-- ============================================================
-- Anonymous Student Support
-- Run this in Supabase SQL Editor after schema.sql
-- Also required: enable Anonymous Sign-ins in
--   Authentication → Settings → Anonymous sign-ins
-- ============================================================

-- CLASSES: allow enrolled students (including anonymous) to view their class
DROP POLICY IF EXISTS "Students can view enrolled classes" ON classes;
CREATE POLICY "Students can view enrolled classes"
ON classes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM class_enrollments
    WHERE class_enrollments.class_id = classes.id
    AND class_enrollments.student_id::text = auth.uid()::text
  )
);

-- ASSIGNMENTS: allow students to view assignments for their enrolled classes
DROP POLICY IF EXISTS "Students can view class assignments" ON assignments;
CREATE POLICY "Students can view class assignments"
ON assignments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM assignment_classes
    JOIN class_enrollments
      ON assignment_classes.class_id = class_enrollments.class_id
    WHERE assignment_classes.assignment_id = assignments.id
    AND class_enrollments.student_id::text = auth.uid()::text
  )
);

-- ASSIGNMENT_CLASSES: allow enrolled students to see which assignments are in their class
DROP POLICY IF EXISTS "Students can view assignment classes" ON assignment_classes;
CREATE POLICY "Students can view assignment classes"
ON assignment_classes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM class_enrollments
    WHERE class_enrollments.class_id = assignment_classes.class_id
    AND class_enrollments.student_id::text = auth.uid()::text
  )
);

-- STUDENT_ASSIGNMENT_PROGRESS: allow students to insert and update their own progress
DROP POLICY IF EXISTS "Students can insert own progress" ON student_assignment_progress;
CREATE POLICY "Students can insert own progress"
ON student_assignment_progress
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = student_id::text);

-- WORD_PROGRESS: allow students to manage their own word-level progress
DROP POLICY IF EXISTS "Students can insert word progress" ON word_progress;
CREATE POLICY "Students can insert word progress"
ON word_progress
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = student_id::text);

DROP POLICY IF EXISTS "Students can update word progress" ON word_progress;
CREATE POLICY "Students can update word progress"
ON word_progress
FOR UPDATE
TO authenticated
USING (auth.uid()::text = student_id::text)
WITH CHECK (auth.uid()::text = student_id::text);

DROP POLICY IF EXISTS "Students can view own word progress" ON word_progress;
CREATE POLICY "Students can view own word progress"
ON word_progress
FOR SELECT
TO authenticated
USING (auth.uid()::text = student_id::text);

-- LEARNING_ACTIVITIES: allow students to log their activities
DROP POLICY IF EXISTS "Students can insert activities" ON learning_activities;
CREATE POLICY "Students can insert activities"
ON learning_activities
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = student_id::text);

-- ASSIGNMENT_STORIES: allow enrolled students to read stories for their assignments
DROP POLICY IF EXISTS "Students can view assignment stories" ON assignment_stories;
CREATE POLICY "Students can view assignment stories"
ON assignment_stories
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM assignment_classes
    JOIN class_enrollments
      ON assignment_classes.class_id = class_enrollments.class_id
    WHERE assignment_classes.assignment_id = assignment_stories.assignment_id
    AND class_enrollments.student_id::text = auth.uid()::text
  )
);

-- Verify
SELECT tablename, policyname, cmd FROM pg_policies
WHERE tablename IN (
  'classes', 'assignments', 'assignment_classes',
  'student_assignment_progress', 'word_progress',
  'learning_activities', 'assignment_stories'
)
ORDER BY tablename, cmd;
