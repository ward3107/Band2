import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from '@/lib/rate-limit';

const STUDENT_DOMAIN = 'student.band2.app';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  // 10 join attempts per IP per 10 minutes
  if (!checkRateLimit(`student-join:${ip}`, { maxRequests: 10, windowMs: 10 * 60_000 })) {
    return NextResponse.json(
      { error: 'Too many attempts. Please wait a few minutes and try again.' },
      { status: 429 }
    );
  }

  let body: { classCode?: string; displayName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { classCode, displayName } = body;

  if (!classCode || !/^[A-Z0-9]{4,8}$/.test(classCode)) {
    return NextResponse.json({ error: 'Invalid class code format' }, { status: 400 });
  }
  if (!displayName || displayName.trim().length < 2) {
    return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 });
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

  // Generate a unique anonymous email + random password for this student
  const uniqueId = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  const email = `s_${uniqueId}@${STUDENT_DOMAIN}`;
  const password = crypto.randomUUID();

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

  // Return credentials so the client can call signInWithPassword() directly.
  // This avoids the setSession() lock contention that occurs when the page
  // reloads immediately after acquiring the Supabase auth token lock.
  return NextResponse.json({
    success: true,
    className: classData.name,
    credentials: { email, password },
  });
}
