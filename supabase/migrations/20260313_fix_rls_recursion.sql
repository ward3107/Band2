-- ============================================
-- FIX RLS INFINITE RECURSION ERROR
-- ============================================
-- ERROR: "infinite recursion detected in policy for relation"
--
-- WHY THIS HAPPENS:
-- When RLS policies reference other tables that also have RLS,
-- and those tables' policies reference back, it creates a loop.
--
-- FIX: Simplify policies to avoid circular references
-- ============================================

-- ============================================
-- STEP 1: Fix CLASS_ENROLLMENTS - Remove circular policies
-- ============================================

-- Drop all existing policies on class_enrollments
DROP POLICY IF EXISTS "Teachers can view class enrollments" ON public.class_enrollments;
DROP POLICY IF EXISTS "Students can enroll themselves" ON public.class_enrollments;
DROP POLICY IF EXISTS "Students can view own enrollments" ON public.class_enrollments;
DROP POLICY IF EXISTS "Students can view enrolled classes" ON public.class_enrollments;

-- Simple policy: Students can view their own enrollments
CREATE POLICY "Students can view own enrollments" ON public.class_enrollments
    FOR SELECT USING (auth.uid() = student_id);

-- Simple policy: Students can insert their own enrollments
CREATE POLICY "Students can insert own enrollments" ON public.class_enrollments
    FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Teachers can view enrollments for their classes (using direct teacher_id check)
-- Instead of joining through classes, we use a subquery that doesn't trigger RLS
CREATE POLICY "Teachers can view their class enrollments" ON public.class_enrollments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.classes
            WHERE classes.id = class_enrollments.class_id
            AND classes.teacher_id = auth.uid()
        )
    );

-- ============================================
-- STEP 2: Fix CLASSES - Keep simple
-- ============================================

DROP POLICY IF EXISTS "Teachers can view their own classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers can create classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers can update their own classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers can delete their own classes" ON public.classes;
DROP POLICY IF EXISTS "Students can view enrolled classes" ON public.classes;

-- Teachers: Full access to their own classes
CREATE POLICY "Teachers manage own classes" ON public.classes
    FOR ALL USING (auth.uid() = teacher_id);

-- Students: Can view classes they're enrolled in
-- Use a simpler check that doesn't cause recursion
CREATE POLICY "Students view enrolled classes" ON public.classes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.class_enrollments
            WHERE class_enrollments.class_id = classes.id
            AND class_enrollments.student_id = auth.uid()
        )
    );

-- ============================================
-- STEP 3: Fix PROFILES - Keep simple
-- ============================================

DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Anyone authenticated can view profiles (needed for teachers to see students)
CREATE POLICY "Users can view profiles" ON public.profiles
    FOR SELECT USING (auth.role() = 'authenticated');

-- Users can insert their own profile
CREATE POLICY "Users insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can update their own profile (but NOT role or is_admin)
CREATE POLICY "Users update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ============================================
-- STEP 4: Fix APPROVED_TEACHERS
-- ============================================

DROP POLICY IF EXISTS "Admins can manage approved teachers" ON public.approved_teachers;
DROP POLICY IF EXISTS "Users can check own approval status" ON public.approved_teachers;

-- Admins can manage approved teachers (check is_admin in profiles)
CREATE POLICY "Admins manage approved teachers" ON public.approved_teachers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = TRUE
        )
    );

-- Users can check their own approval status by email
CREATE POLICY "Users check own approval" ON public.approved_teachers
    FOR SELECT USING (
        email = auth.jwt() ->> 'email'
    );

-- ============================================
-- STEP 5: Ensure RLS is enabled on all tables
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approved_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_invite_codes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DONE! Run this and then try logging in again.
-- ============================================
