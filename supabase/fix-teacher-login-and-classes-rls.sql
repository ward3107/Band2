-- ============================================================
-- Fix teacher login + class creation
-- Run this once in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Add is_admin column to profiles if missing
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- 2. Fix RLS on classes table
--    DROP all existing policies first (avoids conflicts)
DROP POLICY IF EXISTS "Teachers can view their own classes"    ON classes;
DROP POLICY IF EXISTS "Teachers can create classes"            ON classes;
DROP POLICY IF EXISTS "Teachers can update their own classes"  ON classes;
DROP POLICY IF EXISTS "Teachers can delete their own classes"  ON classes;
DROP POLICY IF EXISTS "Enable insert for teachers"             ON classes;
DROP POLICY IF EXISTS "Enable select for teachers"             ON classes;
DROP POLICY IF EXISTS "Enable update for teachers"             ON classes;
DROP POLICY IF EXISTS "Enable delete for teachers"             ON classes;

-- SELECT: teachers see own classes; anyone authenticated can check if a class_code exists
CREATE POLICY "Teachers select own classes" ON classes
  FOR SELECT TO authenticated
  USING (auth.uid() = teacher_id);

-- Allow any authenticated user to look up a class_code (needed for uniqueness check
-- when creating a class, and for students joining by code)
CREATE POLICY "Authenticated can lookup class codes" ON classes
  FOR SELECT TO authenticated
  USING (true);

-- INSERT: teacher can only insert rows where teacher_id = their own uid
CREATE POLICY "Teachers insert own classes" ON classes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = teacher_id);

-- UPDATE / DELETE: own rows only
CREATE POLICY "Teachers update own classes" ON classes
  FOR UPDATE TO authenticated
  USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers delete own classes" ON classes
  FOR DELETE TO authenticated
  USING (auth.uid() = teacher_id);

-- 3. Verify
SELECT policyname, cmd, permissive
  FROM pg_policies
 WHERE tablename = 'classes'
 ORDER BY cmd;
