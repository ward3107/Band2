-- Fix RLS policies for classes table
-- Run this in Supabase SQL Editor

-- First, let's check what policies exist
SELECT * FROM pg_policies WHERE tablename = 'classes';

-- Drop all existing policies on classes
DROP POLICY IF EXISTS "Teachers can view their own classes" ON classes;
DROP POLICY IF EXISTS "Teachers can create classes" ON classes;
DROP POLICY IF EXISTS "Teachers can update their own classes" ON classes;
DROP POLICY IF EXISTS "Teachers can delete their own classes" ON classes;

-- Create simpler policies that use auth.uid() directly
CREATE POLICY "Enable insert for teachers" ON classes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = teacher_id::text);

CREATE POLICY "Enable select for teachers" ON classes
FOR SELECT
TO authenticated
USING (auth.uid()::text = teacher_id::text);

CREATE POLICY "Enable update for teachers" ON classes
FOR UPDATE
TO authenticated
USING (auth.uid()::text = teacher_id::text)
WITH CHECK (auth.uid()::text = teacher_id::text);

CREATE POLICY "Enable delete for teachers" ON classes
FOR DELETE
TO authenticated
USING (auth.uid()::text = teacher_id::text);

-- Verify the policies were created
SELECT * FROM pg_policies WHERE tablename = 'classes';
