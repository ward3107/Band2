-- ============================================
-- GOOGLE OAUTH AUTHENTICATION RLS UPDATES
-- ============================================
-- WHY: With the new Google OAuth system, users create their own profiles
-- during signup. We need RLS policies that allow this while keeping it secure.
--
-- CHANGES:
-- 1. Allow users to INSERT their own profile (during first-time signup)
-- 2. Allow students to INSERT their own enrollments (when joining a class)
-- 3. Keep existing security for all other operations
-- ============================================

-- ============================================
-- PROFILES TABLE - Allow self-registration
-- ============================================
-- Users need to create their own profile after Google OAuth
-- But they can only set their own role IF:
-- - They're a student with a valid class code (verified in the app)
-- - They're a teacher with a valid invite code (verified in the app)

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Note: The role is set by the application code after verifying codes
-- This policy just ensures users can only create profiles for themselves

-- ============================================
-- CLASS_ENROLLMENTS - Allow self-enrollment
-- ============================================
-- Students need to enroll themselves when they first join a class
-- The application code verifies the class code before enrolling

DROP POLICY IF EXISTS "Students can enroll themselves" ON public.class_enrollments;
CREATE POLICY "Students can enroll themselves" ON public.class_enrollments
    FOR INSERT
    WITH CHECK (auth.uid() = student_id);

-- Students can view their own enrollments
DROP POLICY IF EXISTS "Students can view own enrollments" ON public.class_enrollments;
CREATE POLICY "Students can view own enrollments" ON public.class_enrollments
    FOR SELECT
    USING (auth.uid() = student_id);

-- ============================================
-- STUDENT_ASSIGNMENT_PROGRESS - Allow students to create/update
-- ============================================
-- Students need to create progress records when they start assignments

DROP POLICY IF EXISTS "Students can insert own progress" ON public.student_assignment_progress;
CREATE POLICY "Students can insert own progress" ON public.student_assignment_progress
    FOR INSERT
    WITH CHECK (auth.uid() = student_id);

-- ============================================
-- WORD_PROGRESS - Allow students to manage their word progress
-- ============================================

DROP POLICY IF EXISTS "Students can insert own word progress" ON public.word_progress;
CREATE POLICY "Students can insert own word progress" ON public.word_progress
    FOR INSERT
    WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can update own word progress" ON public.word_progress;
CREATE POLICY "Students can update own word progress" ON public.word_progress
    FOR UPDATE
    USING (auth.uid() = student_id)
    WITH CHECK (auth.uid() = student_id);

-- ============================================
-- LEARNING_ACTIVITIES - Allow students to log activities
-- ============================================

DROP POLICY IF EXISTS "Students can insert own activities" ON public.learning_activities;
CREATE POLICY "Students can insert own activities" ON public.learning_activities
    FOR INSERT
    WITH CHECK (auth.uid() = student_id);

-- ============================================
-- CLASSES - Students can view enrolled classes
-- ============================================
-- This already exists in schema.sql but let's make sure it's correct

DROP POLICY IF EXISTS "Students can view enrolled classes" ON public.classes;
CREATE POLICY "Students can view enrolled classes" ON public.classes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.class_enrollments
            WHERE class_enrollments.class_id = classes.id
            AND class_enrollments.student_id = auth.uid()
        )
    );

-- ============================================
-- ASSIGNMENTS - Students can view assignments for enrolled classes
-- ============================================

DROP POLICY IF EXISTS "Students can view class assignments" ON public.assignments;
CREATE POLICY "Students can view class assignments" ON public.assignments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.assignment_classes
            JOIN public.class_enrollments ON assignment_classes.class_id = class_enrollments.class_id
            WHERE assignment_classes.assignment_id = assignments.id
            AND class_enrollments.student_id = auth.uid()
        )
    );

-- ============================================
-- TEACHER_INVITE_CODES - Admin management
-- ============================================
-- Already handled in the teacher_invite_codes migration
-- But let's add a policy for teachers to verify codes during signup

-- The existing "Anyone can verify a specific code" policy allows this
-- No additional changes needed

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
-- Ensure authenticated users can use the necessary sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- ============================================
-- VERIFY POLICIES ARE ACTIVE
-- ============================================
-- Run this query to verify policies are in place:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE tablename IN ('profiles', 'class_enrollments', 'student_assignment_progress', 'word_progress', 'learning_activities', 'classes', 'assignments', 'teacher_invite_codes')
-- ORDER BY tablename, policyname;
