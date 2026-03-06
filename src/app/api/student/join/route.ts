import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from '@/lib/rate-limit';

const STUDENT_DOMAIN = 'student.band2.app';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';

  let body: { classCode?: string; displayName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { classCode, displayName } = body;

  if (!classCode || !/^[A-Z0-9]{6}$/.test(classCode)) {
    return NextResponse.json({ error: 'Invalid class code format' }, { status: 400 });
  }
  if (!displayName || displayName.trim().length < 2) {
    return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 });
  }

  // Rate limit by class code — allows a full classroom (60/hour per class)
  if (!checkRateLimit(`student-join-class:${classCode}`, { maxRequests: 60, windowMs: 60 * 60_000 })) {
    return NextResponse.json(
      { error: 'This class has reached the join limit. Try again in an hour.' },
      { status: 429 }
    );
  }
  // Rate limit by IP — blocks automated abuse but doesn't block shared school WiFi
  if (!checkRateLimit(`student-join-ip:${ip}`, { maxRequests: 20, windowMs: 10 * 60_000 })) {
    return NextResponse.json(
      { error: 'Too many attempts. Please wait a few minutes and try again.' },
      { status: 429 }
    );
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Look up the class by code
  const { data: classData, error: classError } = await admin
    .from('classes')
    .select('id, name')
    .eq('class_code', classCode)
    .single();

  if (classError || !classData) {
    return NextResponse.json(
      { error: 'Class not found. Double-check the code your teacher sent.' },
      { status: 404 }
    );
  }

  // Generate an 8-char personal student code (no confusable characters)
  // The code serves as both the email identifier and the password so students
  // can log back in on a new device just by entering the code.
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let studentCode = '';
  const randomBytes = new Uint8Array(8);
  crypto.getRandomValues(randomBytes);
  for (let i = 0; i < 8; i++) studentCode += chars[randomBytes[i] % chars.length];
  const email = `s_${studentCode.toLowerCase()}@${STUDENT_DOMAIN}`;
  const password = studentCode;

  // Create the auth user (email_confirm: true skips email verification)
  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName.trim() },
  });

  if (createError || !newUser.user) {
    return NextResponse.json(
      { error: 'Failed to create student account. Please try again.' },
      { status: 500 }
    );
  }

  const userId = newUser.user.id;

  // Create the student profile
  const { error: profileError } = await admin.from('profiles').insert({
    id: userId,
    email,
    full_name: displayName.trim(),
    role: 'student',
    student_code: studentCode,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(userId); // roll back
    return NextResponse.json({ error: 'Failed to create student profile' }, { status: 500 });
  }

  // Enroll in the class
  const { error: enrollError } = await admin
    .from('class_enrollments')
    .insert({ class_id: classData.id, student_id: userId });

  if (enrollError) {
    await admin.auth.admin.deleteUser(userId); // roll back
    return NextResponse.json({ error: 'Failed to enroll in class' }, { status: 500 });
  }

  // Return credentials so the client can call signInWithPassword() directly,
  // and the personal studentCode so the UI can show it to the student.
  return NextResponse.json({
    success: true,
    className: classData.name,
    studentCode,
    credentials: { email, password },
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
