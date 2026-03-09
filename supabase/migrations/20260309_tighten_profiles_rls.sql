-- Tighten profiles RLS policies
-- Users should only see their own profile or classmates

-- Drop ALL existing profiles policies first
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Students can view classmates profiles" ON profiles;
DROP POLICY IF EXISTS "Teachers can view their students profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- 1. Users can always view their own profile
CREATE POLICY "Users can view own profile"
ON profiles
FOR SELECT
USING (auth.uid() = id);

-- 2. Students can view their classmates' profiles
CREATE POLICY "Students can view classmates profiles"
ON profiles
FOR SELECT
USING (
  auth.uid() IN (
    SELECT ce.student_id
    FROM class_enrollments ce
    WHERE ce.class_id IN (
      SELECT ce2.class_id
      FROM class_enrollments ce2
      WHERE ce2.student_id = auth.uid()
    )
  )
);

-- 3. Teachers can view profiles of students in their classes
CREATE POLICY "Teachers can view their students profiles"
ON profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM class_enrollments ce
    JOIN classes c ON c.id = ce.class_id
    WHERE ce.student_id = profiles.id
    AND c.teacher_id = auth.uid()
  )
);

-- 4. Admins can view all profiles (needed for management)
-- Note: This checks if the CURRENT user is an admin by looking up their own is_admin field
CREATE POLICY "Admins can view all profiles"
ON profiles
FOR SELECT
USING (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);

-- 5. Users can update their own profile
CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
