-- RLS Policies for Vocab App
-- Run these in Supabase SQL Editor to enable teachers to manage classes and assignments

-- CLASSES TABLE POLICIES
-- Enable RLS
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Teachers can view their own classes" ON classes;
DROP POLICY IF EXISTS "Teachers can create classes" ON classes;
DROP POLICY IF EXISTS "Teachers can update their own classes" ON classes;
DROP POLICY IF EXISTS "Teachers can delete their own classes" ON classes;

-- Teachers can view their own classes
CREATE POLICY "Teachers can view their own classes"
ON classes
FOR SELECT
USING (auth.uid() = teacher_id);

-- Teachers can create classes
CREATE POLICY "Teachers can create classes"
ON classes
FOR INSERT
WITH CHECK (auth.uid() = teacher_id);

-- Teachers can update their own classes
CREATE POLICY "Teachers can update their own classes"
ON classes
FOR UPDATE
USING (auth.uid() = teacher_id)
WITH CHECK (auth.uid() = teacher_id);

-- Teachers can delete their own classes
CREATE POLICY "Teachers can delete their own classes"
ON classes
FOR DELETE
USING (auth.uid() = teacher_id);

-- ASSIGNMENTS TABLE POLICIES
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can view their own assignments" ON assignments;
DROP POLICY IF EXISTS "Teachers can create assignments" ON assignments;
DROP POLICY IF EXISTS "Teachers can update their own assignments" ON assignments;
DROP POLICY IF EXISTS "Teachers can delete their own assignments" ON assignments;

CREATE POLICY "Teachers can view their own assignments"
ON assignments
FOR SELECT
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can create assignments"
ON assignments
FOR INSERT
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own assignments"
ON assignments
FOR UPDATE
USING (auth.uid() = teacher_id)
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own assignments"
ON assignments
FOR DELETE
USING (auth.uid() = teacher_id);

-- ASSIGNMENT_CLASSES TABLE POLICIES
ALTER TABLE assignment_classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can manage assignment classes" ON assignment_classes;

CREATE POLICY "Teachers can manage assignment classes"
ON assignment_classes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM assignments
    WHERE assignments.id = assignment_classes.assignment_id
    AND assignments.teacher_id = auth.uid()
  )
);

-- STUDENT_ASSIGNMENT_PROGRESS TABLE POLICIES
ALTER TABLE student_assignment_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can view student progress" ON student_assignment_progress;
DROP POLICY IF EXISTS "Students can view own progress" ON student_assignment_progress;

CREATE POLICY "Teachers can view student progress"
ON student_assignment_progress
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM assignments
    WHERE assignments.id = student_assignment_progress.assignment_id
    AND assignments.teacher_id = auth.uid()
  )
);

CREATE POLICY "Students can view own progress"
ON student_assignment_progress
FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Students can update own progress"
ON student_assignment_progress
FOR UPDATE
USING (auth.uid() = student_id)
WITH CHECK (auth.uid() = student_id);

-- CLASS_ENROLLMENTS TABLE POLICIES
ALTER TABLE class_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can view class enrollments" ON class_enrollments;

CREATE POLICY "Teachers can view class enrollments"
ON class_enrollments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = class_enrollments.class_id
    AND classes.teacher_id = auth.uid()
  )
);

-- PROFILES TABLE POLICIES (for reading)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can view all profiles"
ON profiles
FOR SELECT
USING (true);

CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
