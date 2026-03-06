import { NextRequest, NextResponse } from 'next/server';
import { parseTeacherData, generateTeacherCode } from '@/lib/password-generator';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { SupabaseClient } from '@supabase/supabase-js';

const TEACHER_CODE_DOMAIN = 'teacher.band2.app';

// Validation helpers
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateName(name: string): boolean {
  return name.trim().length >= 2 && name.trim().length <= 100;
}

/** Generate a code that doesn't already exist in the profiles table */
async function generateUniqueCode(supabaseAdmin: SupabaseClient): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const code = generateTeacherCode();
    const email = `${code}@${TEACHER_CODE_DOMAIN}`;
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (!data) return code;
  }
  throw new Error('Could not generate unique teacher code after 20 attempts');
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

  // Categorise input lines as either email-based or name-only (code-based)
  const emailEntries: Array<{ name: string; email: string }> = [];
  const nameEntries: Array<{ name: string }> = [];

  if (typeof rawData === 'string') {
    for (const line of rawData.split('\n').filter((l: string) => l.trim())) {
      if (line.includes('@')) {
        const parsed = parseTeacherData(line);
        emailEntries.push(...parsed);
      } else {
        const name = line.trim();
        if (name.length >= 2) nameEntries.push({ name });
      }
    }
  } else if (Array.isArray(teachers)) {
    emailEntries.push(...(teachers as Array<{ name: string; email: string }>));
  } else {
    return NextResponse.json({ error: 'Invalid input format' }, { status: 400 });
  }

  const results = {
    added: [] as Array<{ email?: string; name: string; code?: string }>,
    failed: [] as Array<{ name: string; error: string }>,
    skipped: [] as Array<{ name: string; reason: string }>,
  };

  // ── Email-based teachers (add to approved_teachers allowlist) ──────────────
  for (const { name, email } of emailEntries) {
    if (!validateEmail(email)) {
      results.failed.push({ name, error: 'Invalid email format' });
      continue;
    }
    if (!validateName(name)) {
      results.failed.push({ name, error: 'Invalid name (2-100 characters required)' });
      continue;
    }

    const { data: existing } = await supabaseAdmin
      .rpc('is_approved_teacher', { check_email: email })
      .maybeSingle();

    if (existing) {
      results.skipped.push({ name, reason: 'Already in approved list' });
      continue;
    }

    const { error: insertError } = await supabaseAdmin
      .from('approved_teachers')
      .insert({ email, full_name: name, added_by: userId, created_at: new Date().toISOString() });

    if (insertError) {
      results.failed.push({ name, error: 'Failed to add to approved list' });
      continue;
    }

    results.added.push({ email, name });
  }

  // ── Name-only teachers (code-based — create auth user + profile) ───────────
  for (const { name } of nameEntries) {
    if (!validateName(name)) {
      results.failed.push({ name, error: 'Invalid name (2-100 characters required)' });
      continue;
    }

    let code: string;
    try {
      code = await generateUniqueCode(supabaseAdmin);
    } catch {
      results.failed.push({ name, error: 'Could not generate unique code' });
      continue;
    }

    const email = `${code}@${TEACHER_CODE_DOMAIN}`;

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: code,
      email_confirm: true,
      user_metadata: { full_name: name },
    });

    if (authError || !authData.user) {
      results.failed.push({ name, error: 'Failed to create teacher account' });
      continue;
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        email,
        full_name: name,
        role: 'teacher',
        is_admin: false,
        created_at: new Date().toISOString(),
      });

    if (profileError) {
      // Roll back auth user to avoid orphan accounts
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      results.failed.push({ name, error: 'Failed to create teacher profile' });
      continue;
    }

    results.added.push({ name, code });
  }

  return NextResponse.json({
    message: `Added ${results.added.length} teachers`,
    results,
  });
}

// GET endpoint to list teachers
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

  const codeTeachers = (actualTeachers ?? []).filter((t: { email: string }) =>
    t.email?.endsWith(`@${TEACHER_CODE_DOMAIN}`)
  );

  return NextResponse.json({
    approved: approvedTeachers ?? [],
    teachers: actualTeachers ?? [],
    codeTeachers,
  });
}
