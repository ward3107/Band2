-- Fix: Drop any old triggers on assignments that reference class_id
-- This error occurs because the schema was changed to use assignment_classes junction table
-- but old triggers still try to access new.class_id

-- Drop any triggers that might reference class_id on assignments
DROP TRIGGER IF EXISTS on_assignment_created ON public.assignments;
DROP TRIGGER IF EXISTS after_assignment_insert ON public.assignments;
DROP TRIGGER IF EXISTS before_assignment_insert ON public.assignments;
DROP TRIGGER IF EXISTS sync_student_progress ON public.assignments;

-- Also drop any similar triggers on assignment_classes
DROP TRIGGER IF EXISTS on_assignment_class_created ON public.assignment_classes;
DROP TRIGGER IF EXISTS after_assignment_class_insert ON public.assignment_classes;

-- Note: If the error persists, check for functions that reference class_id
-- Run this query to find them:
-- SELECT proname, prosrc FROM pg_proc WHERE prosrc LIKE '%class_id%' AND prosrc LIKE '%assignments%';
