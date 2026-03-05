-- Add assignment_type column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assignments' AND column_name = 'assignment_type'
  ) THEN
    ALTER TABLE public.assignments ADD COLUMN assignment_type TEXT DEFAULT 'both';
  END IF;
END $$;

-- Add allowed_modes column for specifying which study modes students can use
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assignments' AND column_name = 'allowed_modes'
  ) THEN
    ALTER TABLE public.assignments ADD COLUMN allowed_modes TEXT[];
  END IF;
END $$;

-- Add custom_words column for teacher-supplied words not in vocabulary bank
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assignments' AND column_name = 'custom_words'
  ) THEN
    ALTER TABLE public.assignments ADD COLUMN custom_words JSONB;
  END IF;
END $$;
