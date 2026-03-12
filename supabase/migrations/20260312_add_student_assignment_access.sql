-- Enable students to view assignments for their enrolled classes
-- This policy allows students to see assignments through their class enrollments

-- Drop existing policies on assignments if they restrict student access
DROP POLICY IF EXISTS "Students can view assignments via class enrollment" ON public.assignments;

-- Create policy to allow students to view assignments they have access to
CREATE POLICY "Students can view assignments via class enrollment"
ON public.assignments
FOR SELECT
USING (
    -- Student can see the assignment if they are enrolled in a class that has this assignment
    EXISTS (
        SELECT 1
        FROM public.class_enrollments ce
        INNER JOIN public.assignment_classes ac ON ac.class_id = ce.class_id
        WHERE ce.student_id = auth.uid()
          AND ac.assignment_id = public.assignments.id
    )
    -- OR the student is the teacher who created it
    OR (public.assignments.teacher_id = auth.uid())
);

-- Enable RLS on assignments table
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- Ensure the policy is applied
ALTER TABLE public.assignments FORCE ROW LEVEL SECURITY;
