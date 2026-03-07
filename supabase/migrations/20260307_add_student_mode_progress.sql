-- Create table to track progress for each study mode
CREATE TABLE IF NOT EXISTS public.student_mode_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('flashcards', 'quiz', 'matching', 'story', 'spelling', 'scramble', 'fill-in-blank')),
  words_studied INT DEFAULT 0,
  correct_answers INT DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, assignment_id, mode)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_mode_progress_student ON public.student_mode_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_mode_progress_assignment ON public.student_mode_progress(assignment_id);
CREATE INDEX IF NOT EXISTS idx_mode_progress_student_assignment ON public.student_mode_progress(student_id, assignment_id);

-- Enable RLS
ALTER TABLE public.student_mode_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Students can view own mode progress" ON public.student_mode_progress;
CREATE POLICY "Students can view own mode progress" ON public.student_mode_progress
  FOR SELECT USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can insert own mode progress" ON public.student_mode_progress;
CREATE POLICY "Students can insert own mode progress" ON public.student_mode_progress
  FOR INSERT WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can update own mode progress" ON public.student_mode_progress;
CREATE POLICY "Students can update own mode progress" ON public.student_mode_progress
  FOR UPDATE USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Teachers can view mode progress for their assignments
DROP POLICY IF EXISTS "Teachers can view student mode progress" ON public.student_mode_progress;
CREATE POLICY "Teachers can view student mode progress" ON public.student_mode_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.assignments
      WHERE assignments.id = student_mode_progress.assignment_id
      AND assignments.teacher_id = auth.uid()
    )
  );
