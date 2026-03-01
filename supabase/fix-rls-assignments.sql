-- Fix RLS policies for assignments table
-- Run this in Supabase SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "Enable insert for teachers" ON assignments;
DROP POLICY IF EXISTS "Enable select for teachers" ON assignments;
DROP POLICY IF EXISTS "Enable update for teachers" ON assignments;
DROP POLICY IF EXISTS "Enable delete for teachers" ON assignments;

-- Create simpler policies that use auth.uid() directly
CREATE POLICY "Enable insert for teachers" ON assignments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = teacher_id::text);

CREATE POLICY "Enable select for teachers" ON assignments
FOR SELECT
TO authenticated
USING (auth.uid()::text = teacher_id::text);

CREATE POLICY "Enable update for teachers" ON assignments
FOR UPDATE
TO authenticated
USING (auth.uid()::text = teacher_id::text)
WITH CHECK (auth.uid()::text = teacher_id::text);

CREATE POLICY "Enable delete for teachers" ON assignments
FOR DELETE
TO authenticated
USING (auth.uid()::text = teacher_id::text);

-- Verify the policies were created
SELECT * FROM pg_policies WHERE tablename = 'assignments';
