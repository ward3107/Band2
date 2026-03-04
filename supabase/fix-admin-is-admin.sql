-- Fix: Add is_admin support to approved_teachers and grant admin to existing admin user.
--
-- Run this in Supabase SQL Editor.

-- 1. Add is_admin column to approved_teachers (idempotent)
ALTER TABLE public.approved_teachers
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 2. Make wasya92@gmail.com an admin in profiles table
UPDATE public.profiles
  SET is_admin = TRUE
  WHERE email = 'wasya92@gmail.com';

-- 3. Upsert wasya92@gmail.com into approved_teachers as admin
--    (in case they need to re-sign in from a fresh device)
INSERT INTO public.approved_teachers (email, full_name, is_admin)
  VALUES ('wasya92@gmail.com', 'Admin', TRUE)
  ON CONFLICT (email) DO UPDATE SET is_admin = TRUE;
