-- Create a test class manually
-- Run this in Supabase SQL Editor
-- Replace 'YOUR_TEACHER_ID' with the actual teacher ID from the profiles table

-- First, let's get your teacher ID
SELECT id, email, full_name, role FROM profiles WHERE role = 'teacher';

-- Then insert a class (replace YOUR_TEACHER_ID with the actual id from above)
INSERT INTO classes (teacher_id, name, grade_level, class_code)
VALUES ('YOUR_TEACHER_ID', '7th Grade English - Class A', '7', 'ENG7A01');

-- Verify it was created
SELECT * FROM classes;
