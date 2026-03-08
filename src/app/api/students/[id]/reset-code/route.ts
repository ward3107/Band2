import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { verifyAdminAuth } from '@/lib/admin-auth';

const STUDENT_DOMAIN = 'student.band2.app';

/**
 * Generate a unique 8-character student code
 */
function generateStudentCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[crypto.randomInt(chars.length)];
  }
  return code;
}

/**
 * Generate a code that doesn't already exist
 */
async function generateUniqueCode(supabaseAdmin: any): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const code = generateStudentCode();
    const email = `s_${code.toLowerCase()}@${STUDENT_DOMAIN}`;
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (!data) return code;
  }
  throw new Error('Could not generate unique student code after 20 attempts');
}

// GET - Check if teacher has permission to reset this student's code
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth(request);
  if (auth.errorResponse) return auth.errorResponse;
  const { userId, supabaseAdmin } = auth;

  const { id: studentId } = await params;

  // Check if the requesting user is a teacher and owns the student's class
  const { data: teacher } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (teacher?.role === 'teacher') {
    // Verify the student is enrolled in one of the teacher's classes
    const { data: enrollment } = await supabaseAdmin
      .from('class_enrollments')
      .select('classes!inner(teacher_id)')
      .eq('student_id', studentId)
      .eq('classes.teacher_id', userId)
      .maybeSingle();

    if (!enrollment) {
      return NextResponse.json(
        { error: 'You can only reset codes for students in your classes' },
        { status: 403 }
      );
    }
  }

  // Fetch student info
  const { data: student } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email, student_code, last_login')
    .eq('id', studentId)
    .single();

  if (!student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  return NextResponse.json({ student });
}

// POST - Reset student code
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth(request);
  if (auth.errorResponse) return auth.errorResponse;
  const { userId, supabaseAdmin } = auth;

  const { id: studentId } = await params;

  // Check if the requesting user is a teacher and owns the student's class
  const { data: teacher } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (teacher?.role === 'teacher') {
    // Verify the student is enrolled in one of the teacher's classes
    const { data: enrollment } = await supabaseAdmin
      .from('class_enrollments')
      .select('classes!inner(teacher_id)')
      .eq('student_id', studentId)
      .eq('classes.teacher_id', userId)
      .maybeSingle();

    if (!enrollment) {
      return NextResponse.json(
        { error: 'You can only reset codes for students in your classes' },
        { status: 403 }
      );
    }
  }

  // Get current student data
  const { data: currentStudent } = await supabaseAdmin
    .from('profiles')
    .select('email, id')
    .eq('id', studentId)
    .single();

  if (!currentStudent) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  // Generate new unique code
  let newCode: string;
  try {
    newCode = await generateUniqueCode(supabaseAdmin);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate unique code' },
      { status: 500 }
    );
  }

  const newEmail = `s_${newCode.toLowerCase()}@${STUDENT_DOMAIN}`;

  // Update Supabase Auth user (email and password)
  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
    studentId,
    {
      email: newEmail,
      password: newCode,
      email_confirm: true,
    }
  );

  if (authError) {
    console.error('Failed to update auth user:', authError);
    return NextResponse.json(
      { error: 'Failed to update authentication' },
      { status: 500 }
    );
  }

  // Update profile with new code and reset failed login attempts
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({
      email: newEmail,
      student_code: newCode,
      failed_login_attempts: 0,
      locked_until: null,
    })
    .eq('id', studentId);

  if (profileError) {
    console.error('Failed to update profile:', profileError);
    return NextResponse.json(
      { error: 'Failed to update student profile' },
      { status: 500 }
    );
  }

  // Log the code reset action
  await supabaseAdmin.from('login_attempts').insert({
    user_id: studentId,
    code_prefix: newCode.substring(0, 3),
    ip_address: request.headers.get('x-forwarded-for') || 'unknown',
    user_agent: request.headers.get('user-agent') || '',
    success: true,
  });

  return NextResponse.json({
    success: true,
    newCode,
    newEmail,
    message: 'Student code has been reset successfully',
  });
}

// DELETE - Unlock a locked student account
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth(request);
  if (auth.errorResponse) return auth.errorResponse;
  const { userId, supabaseAdmin } = auth;

  const { id: studentId } = await params;

  // Check if the requesting user is a teacher and owns the student's class
  const { data: teacher } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (teacher?.role === 'teacher') {
    // Verify the student is enrolled in one of the teacher's classes
    const { data: enrollment } = await supabaseAdmin
      .from('class_enrollments')
      .select('classes!inner(teacher_id)')
      .eq('student_id', studentId)
      .eq('classes.teacher_id', userId)
      .maybeSingle();

    if (!enrollment) {
      return NextResponse.json(
        { error: 'You can only unlock accounts for students in your classes' },
        { status: 403 }
      );
    }
  }

  // Unlock the account
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      failed_login_attempts: 0,
      locked_until: null,
    })
    .eq('id', studentId);

  if (error) {
    return NextResponse.json(
      { error: 'Failed to unlock account' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Account has been unlocked',
  });
}
