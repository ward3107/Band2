-- Fix RLS policies for assignment_classes table
-- Run this in Supabase SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "Enable insert for assignment_classes" ON assignment_classes;
DROP POLICY IF EXISTS "Enable select for assignment_classes" ON assignment_classes;
DROP POLICY IF EXISTS "Enable update for assignment_classes" ON assignment_classes;
DROP POLICY IF EXISTS "Enable delete for assignment_classes" ON assignment_classes;

-- Create INSERT policy
CREATE POLICY "Enable insert for assignment_classes" ON assignment_classes
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM assignments
    WHERE assignments.id = assignment_classes.assignment_id
    AND assignments.teacher_id::text = auth.uid()::text
  )
);

-- Create SELECT policy
CREATE POLICY "Enable select for assignment_classes" ON assignment_classes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM assignments
    WHERE assignments.id = assignment_classes.assignment_id
    AND assignments.teacher_id::text = auth.uid()::text
  )
);

-- Create DELETE policy
CREATE POLICY "Enable delete for assignment_classes" ON assignment_classes
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM assignments
    WHERE assignments.id = assignment_classes.assignment_id
    AND assignments.teacher_id::text = auth.uid()::text
  )
);

-- Verify the policies were created
SELECT * FROM pg_policies WHERE tablename = 'assignment_classes';
