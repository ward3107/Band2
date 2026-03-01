-- Fix RLS policies for profiles table
-- Run this in Supabase SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Enable select for profiles" ON profiles;
DROP POLICY IF EXISTS "Enable update for profiles" ON profiles;

-- Users can view all profiles (needed for teachers to see students)
CREATE POLICY "Enable select for profiles" ON profiles
FOR SELECT
TO authenticated
USING (true);

-- Users can insert their own profile (on signup)
CREATE POLICY "Enable insert for own profile" ON profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = id::text);

-- Users can update their own profile
CREATE POLICY "Enable update for own profile" ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid()::text = id::text)
WITH CHECK (auth.uid()::text = id::text);

-- Verify
SELECT * FROM pg_policies WHERE tablename = 'profiles';
