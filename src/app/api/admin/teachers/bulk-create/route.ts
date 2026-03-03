import { NextRequest, NextResponse } from 'next/server';
import { parseTeacherData } from '@/lib/password-generator';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { checkRateLimit } from '@/lib/rate-limit';

// Validation helpers
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateName(name: string): boolean {
  return name.trim().length >= 2 && name.trim().length <= 100;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  if (!checkRateLimit(`bulk-create:${ip}`, { maxRequests: 10, windowMs: 60_000 })) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const auth = await verifyAdminAuth(request);
  if (auth.errorResponse) return auth.errorResponse;
  const { userId, supabaseAdmin } = auth;

  let body: { teachers?: unknown; data?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { teachers, data: rawData } = body;

  let teachersToAdd: Array<{ name: string; email: string }> = [];

  if (typeof rawData === 'string') {
    teachersToAdd = parseTeacherData(rawData);
  } else if (Array.isArray(teachers)) {
    teachersToAdd = teachers as Array<{ name: string; email: string }>;
  } else {
    return NextResponse.json({ error: 'Invalid input format' }, { status: 400 });
  }

  const results = {
    added: [] as Array<{ email: string; name: string }>,
    failed: [] as Array<{ email: string; error: string }>,
    skipped: [] as Array<{ email: string; reason: string }>,
  };

  for (const teacher of teachersToAdd) {
    const { name, email } = teacher;

    if (!validateEmail(email)) {
      results.failed.push({ email, error: 'Invalid email format' });
      continue;
    }

    if (!validateName(name)) {
      results.failed.push({ email, error: 'Invalid name (2-100 characters required)' });
      continue;
    }

    const { data: existing } = await supabaseAdmin
      .from('approved_teachers')
      .select('email')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      results.skipped.push({ email, reason: 'Already in approved list' });
      continue;
    }

    const { error: insertError } = await supabaseAdmin
      .from('approved_teachers')
      .insert({
        email,
        full_name: name,
        added_by: userId,
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      results.failed.push({ email, error: insertError.message });
      continue;
    }

    results.added.push({ email, name });
  }

  return NextResponse.json({
    message: `Added ${results.added.length} teachers to approved list`,
    results,
  });
}

// GET endpoint to list approved teachers
export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  if (!checkRateLimit(`bulk-create-get:${ip}`, { maxRequests: 30, windowMs: 60_000 })) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const auth = await verifyAdminAuth(request);
  if (auth.errorResponse) return auth.errorResponse;
  const { supabaseAdmin } = auth;

  const { data: approvedTeachers, error } = await supabaseAdmin
    .from('approved_teachers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch approved teachers' }, { status: 500 });
  }

  const { data: actualTeachers } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name, is_admin, created_at')
    .eq('role', 'teacher')
    .order('created_at', { ascending: false });

  return NextResponse.json({
    approved: approvedTeachers ?? [],
    teachers: actualTeachers ?? [],
  });
}
