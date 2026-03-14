-- ============================================
-- CREATE OR REPLACE CLAIM TEACHER CODE FUNCTION
-- ============================================
-- This function is needed for teachers to claim invite codes
-- Run this in your Supabase SQL Editor
-- ============================================

-- Drop the function if it exists
DROP FUNCTION IF EXISTS public.claim_teacher_code(TEXT, UUID);

-- Create the function
CREATE FUNCTION public.claim_teacher_code(
    p_code TEXT,
    p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_code_record RECORD;
BEGIN
    -- Step 1: Find the code
    SELECT * INTO v_code_record
    FROM public.teacher_invite_codes
    WHERE code = p_code;

    -- Step 2: Check if code exists
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid code. Please check and try again.'
        );
    END IF;

    -- Step 3: Check if already claimed
    IF v_code_record.is_claimed THEN
        RETURN json_build_object(
            'success', false,
            'error', 'This code has already been used by another teacher.'
        );
    END IF;

    -- Step 4: Claim the code (atomic update)
    UPDATE public.teacher_invite_codes
    SET
        is_claimed = TRUE,
        claimed_by = p_user_id,
        claimed_at = NOW()
    WHERE id = v_code_record.id
    AND is_claimed = FALSE;

    -- Step 5: Verify the update worked
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'This code was just used by someone else. Please try again.'
        );
    END IF;

    -- Step 6: Success!
    RETURN json_build_object(
        'success', true,
        'error', null
    );
END;
$$;

-- Grant permission to run this function
GRANT EXECUTE ON FUNCTION public.claim_teacher_code(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_teacher_code(TEXT, UUID) TO anon;

-- Verify the function was created
SELECT
    proname as function_name,
    proargnames as argument_names,
    prosrc as function_body
FROM pg_proc
WHERE proname = 'claim_teacher_code';
