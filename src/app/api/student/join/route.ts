import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const accessToken = authHeader.slice(7);

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

  // Verify the bearer token and get the user identity
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  );
  const { data: { user }, error: userError } = await anonClient.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  // Use service role to bypass RLS for privileged operations
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

  // Create or update the student profile (guest email prevents unique constraint issues)
  const { error: profileError } = await admin
    .from('profiles')
    .upsert(
      {
        id: user.id,
        email: `guest_${user.id}@anonymous.local`,
        full_name: displayName.trim(),
        role: 'student',
      },
      { onConflict: 'id' }
    );

  if (profileError) {
    return NextResponse.json({ error: 'Failed to create student profile' }, { status: 500 });
  }

  // Check for existing enrollment (idempotent)
  const { data: existing } = await admin
    .from('class_enrollments')
    .select('id')
    .eq('class_id', classData.id)
    .eq('student_id', user.id)
    .maybeSingle();

  if (!existing) {
    const { error: enrollError } = await admin
      .from('class_enrollments')
      .insert({ class_id: classData.id, student_id: user.id });

    if (enrollError) {
      return NextResponse.json({ error: 'Failed to enroll in class' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, className: classData.name });
}
