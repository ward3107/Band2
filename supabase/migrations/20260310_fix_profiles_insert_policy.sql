-- Fix: Allow users to insert their own profile
-- This fixes the circular reference issue where new users can't create profiles

-- Drop existing insert policy if any
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Allow users to insert their own profile (only for their own id)
CREATE POLICY "Users can insert own profile"
ON profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Also fix the admin policy to handle NULL profiles gracefully
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

CREATE POLICY "Admins can view all profiles"
ON profiles
FOR SELECT
USING (
  -- User is admin (has is_admin=true)
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  OR
  -- User has no profile yet (allow initial profile creation)
  NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid()
  )
);
