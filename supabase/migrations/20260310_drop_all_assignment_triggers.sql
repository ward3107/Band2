-- Comprehensive fix: Drop ALL triggers on assignments table
-- Then we can recreate any needed ones

-- First, let's see what triggers exist (run this to see the list)
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'assignments';

-- Now drop ALL triggers on assignments (comment this out after seeing the list above)
-- Uncomment and run the appropriate DROP TRIGGER statements based on the results above

-- Generic drop for any trigger on assignments
DO $$
DECLARE
    trig RECORD;
BEGIN
    FOR trig IN
        SELECT trigger_name
        FROM information_schema.triggers
        WHERE event_object_table = 'assignments'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trig.trigger_name || ' ON public.assignments';
        RAISE NOTICE 'Dropped trigger: %', trig.trigger_name;
    END LOOP;
END $$;

-- Verify all triggers are dropped
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'assignments';
-- This should return no rows
