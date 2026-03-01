-- Fix infinite recursion by adding teacher_id to assignment_classes
-- Run this in Supabase SQL Editor

-- Add teacher_id column to assignment_classes
ALTER TABLE assignment_classes ADD COLUMN IF NOT EXISTS teacher_id UUID;

-- Update existing records to have teacher_id from assignments
UPDATE assignment_classes
SET teacher_id = (
  SELECT assignments.teacher_id
  FROM assignments
  WHERE assignments.id = assignment_classes.assignment_id
)
WHERE teacher_id IS NULL;

-- Drop old policies
DROP POLICY IF EXISTS "Enable insert for assignment_classes" ON assignment_classes;
DROP POLICY IF EXISTS "Enable select for assignment_classes" ON assignment_classes;
DROP POLICY IF EXISTS "Enable update for assignment_classes" ON assignment_classes;
DROP POLICY IF EXISTS "Enable delete for assignment_classes" ON assignment_classes;
DROP POLICY IF EXISTS "Enable all for teachers on assignment_classes" ON assignment_classes;
DROP POLICY IF EXISTS "Teachers can manage assignment classes" ON assignment_classes;

-- Create simple policies using teacher_id directly
CREATE POLICY "Enable insert for assignment_classes" ON assignment_classes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = teacher_id::text);

CREATE POLICY "Enable select for assignment_classes" ON assignment_classes
FOR SELECT
TO authenticated
USING (auth.uid()::text = teacher_id::text);

CREATE POLICY "Enable update for assignment_classes" ON assignment_classes
FOR UPDATE
TO authenticated
USING (auth.uid()::text = teacher_id::text)
WITH CHECK (auth.uid()::text = teacher_id::text);

CREATE POLICY "Enable delete for assignment_classes" ON assignment_classes
FOR DELETE
TO authenticated
USING (auth.uid()::text = teacher_id::text);

-- Verify
SELECT * FROM pg_policies WHERE tablename = 'assignment_classes';
