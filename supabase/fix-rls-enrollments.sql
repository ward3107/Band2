-- Fix RLS policies for class_enrollments table
-- Run this in Supabase SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "Enable insert for students on enrollments" ON class_enrollments;
DROP POLICY IF EXISTS "Enable select for enrollments" ON class_enrollments;
DROP POLICY IF EXISTS "Teachers can view class enrollments" ON class_enrollments;

-- Students can insert (join classes)
CREATE POLICY "Enable insert for students on enrollments" ON class_enrollments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = student_id::text);

-- Teachers can view enrollments for their classes
CREATE POLICY "Enable select for teachers on enrollments" ON class_enrollments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = class_enrollments.class_id
    AND classes.teacher_id::text = auth.uid()::text
  )
);

-- Students can view their own enrollments
CREATE POLICY "Enable select for students on enrollments" ON class_enrollments
FOR SELECT
TO authenticated
USING (auth.uid()::text = student_id::text);

-- Verify
SELECT * FROM pg_policies WHERE tablename = 'class_enrollments';
