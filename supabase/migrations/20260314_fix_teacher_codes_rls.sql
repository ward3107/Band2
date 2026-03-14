-- ============================================
-- FIX TEACHER INVITE CODES RLS POLICIES
-- ============================================
-- PROBLEM: The existing RLS policy for teacher_invite_codes
-- creates a circular dependency when querying with nested joins.
-- The admin policy queries the profiles table to check is_admin,
-- but profiles also has RLS enabled, causing issues.
--
-- SOLUTION: Use SECURITY DEFINER function for admin checks
-- and simplify RLS policies to avoid circular references.
-- ============================================

-- Drop existing policies that cause circular dependency
DROP POLICY IF EXISTS "Admins can manage teacher invite codes" ON public.teacher_invite_codes;
DROP POLICY IF EXISTS "Anyone can verify a specific code" ON public.teacher_invite_codes;

-- ============================================
-- NEW APPROACH: Use SECURITY DEFINER function
-- ============================================

-- Create a helper function that checks if user is admin
-- This function runs with definer rights, bypassing RLS
DROP FUNCTION IF EXISTS public.current_user_is_admin();

CREATE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
    -- Direct table access with SECURITY DEFINER bypasses RLS
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_admin = TRUE
    );
END;
$$;

-- ============================================
-- NEW RLS POLICIES
-- ============================================

-- Policy: Admins can do everything (using the helper function)
CREATE POLICY "Admins can manage teacher invite codes" ON public.teacher_invite_codes
    FOR ALL USING (public.current_user_is_admin());

-- Policy: Authenticated users can view invite codes
-- This is needed for the nested join to work properly
CREATE POLICY "Authenticated users can view invite codes" ON public.teacher_invite_codes
    FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Ensure authenticated users have SELECT permission
GRANT SELECT ON public.teacher_invite_codes TO authenticated;
GRANT INSERT ON public.teacher_invite_codes TO authenticated;
GRANT UPDATE ON public.teacher_invite_codes TO authenticated;
GRANT DELETE ON public.teacher_invite_codes TO authenticated;

-- ============================================
-- VERIFICATION
-- ============================================

-- The function should be accessible to all roles
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO anon;

-- RLS is already enabled on the table from previous migration
-- No need to enable again
