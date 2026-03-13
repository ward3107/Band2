-- ============================================
-- TEACHER INVITE CODES TABLE
-- ============================================
-- WHY: We need a secure way to verify that only authorized
-- people can become teachers. Each teacher gets a unique code
-- that can only be used once.
--
-- HOW IT WORKS:
-- 1. Admin generates codes (e.g., ALI-7X2K, FATIMA-9M4P)
-- 2. Admin sends each code to one teacher via WhatsApp
-- 3. Teacher signs in with Google, enters their code
-- 4. Code is marked as "claimed" and linked to that teacher
-- 5. If someone tries to use the same code → REJECTED
-- ============================================

-- Drop the table if it exists (to start fresh)
DROP TABLE IF EXISTS public.teacher_invite_codes CASCADE;

-- Create the table
CREATE TABLE public.teacher_invite_codes (
    -- Unique ID for this code (internal use)
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

    -- The actual code the teacher enters (e.g., "ALI-7X2K")
    -- Must be unique - no two teachers can have the same code
    code TEXT UNIQUE NOT NULL,

    -- Has this code been used yet?
    -- FALSE = still available, can be claimed
    -- TRUE = already used by a teacher
    is_claimed BOOLEAN DEFAULT FALSE,

    -- WHO claimed this code? (linked to their profile)
    -- NULL until someone uses the code
    -- After claiming, this links to the teacher's profile
    claimed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- WHEN was this code claimed?
    -- NULL until someone uses the code
    claimed_at TIMESTAMPTZ,

    -- Optional: Teacher's name (for admin to know who this code is for)
    -- Admin can pre-fill this when generating the code
    intended_for TEXT,

    -- When was this code created?
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Who created this code? (usually admin)
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Create indexes for fast lookups
CREATE INDEX idx_teacher_codes_code ON public.teacher_invite_codes(code);
CREATE INDEX idx_teacher_codes_claimed ON public.teacher_invite_codes(is_claimed);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

ALTER TABLE public.teacher_invite_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can do everything
CREATE POLICY "Admins can manage teacher invite codes" ON public.teacher_invite_codes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

-- Policy: Allow anyone to check codes (we verify in the API)
CREATE POLICY "Anyone can verify a specific code" ON public.teacher_invite_codes
    FOR SELECT USING (true);

-- ============================================
-- HELPER FUNCTION: Claim a code
-- ============================================

-- Drop the function if it exists
DROP FUNCTION IF EXISTS public.claim_teacher_code(TEXT, UUID);

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
