-- Fix RLS policies for student_assignment_progress table
-- Run this in Supabase SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "Teachers can view student progress" ON student_assignment_progress;
DROP POLICY IF EXISTS "Students can view own progress" ON student_assignment_progress;
DROP POLICY IF EXISTS "Students can update own progress" ON student_assignment_progress;

-- Teachers can view progress for their assignments
CREATE POLICY "Teachers can view student progress" ON student_assignment_progress
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM assignments
    WHERE assignments.id = student_assignment_progress.assignment_id
    AND assignments.teacher_id::text = auth.uid()::text
  )
);

-- Students can view their own progress
CREATE POLICY "Students can view own progress" ON student_assignment_progress
FOR SELECT
TO authenticated
USING (auth.uid()::text = student_id::text);

-- Students can update their own progress
CREATE POLICY "Students can update own progress" ON student_assignment_progress
FOR UPDATE
TO authenticated
USING (auth.uid()::text = student_id::text)
WITH CHECK (auth.uid()::text = student_id::text);

-- Students can insert their own progress (auto-created when assignment is assigned)
CREATE POLICY "Students can insert own progress" ON student_assignment_progress
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = student_id::text);

-- Verify
SELECT * FROM pg_policies WHERE tablename = 'student_assignment_progress';
