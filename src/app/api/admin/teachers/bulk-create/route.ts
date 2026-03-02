import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { parseTeacherData } from '@/lib/password-generator';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Validation helper
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateName(name: string): boolean {
  return name.trim().length >= 2 && name.trim().length <= 100;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the requester is an admin
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if user is an admin (teacher role with admin flag)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_admin')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'teacher' || !profile.is_admin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { teachers, data: rawData } = body;

    let teachersToAdd: Array<{ name: string; email: string }> = [];

    if (rawData) {
      // Parse CSV/raw data
      teachersToAdd = parseTeacherData(rawData);
    } else if (Array.isArray(teachers)) {
      // Use provided array
      teachersToAdd = teachers;
    } else {
      return NextResponse.json({ error: 'Invalid input format' }, { status: 400 });
    }

    // Validate and add to approved list
    const results = {
      added: [] as Array<{ email: string; name: string }>,
      failed: [] as Array<{ email: string; error: string }>,
      skipped: [] as Array<{ email: string; reason: string }>
    };

    for (const teacher of teachersToAdd) {
      const { name, email } = teacher;

      // Validate
      if (!validateEmail(email)) {
        results.failed.push({ email, error: 'Invalid email format' });
        continue;
      }

      if (!validateName(name)) {
        results.failed.push({ email, error: 'Invalid name (2-100 characters required)' });
        continue;
      }

      // Check if already in approved list
      const { data: existing } = await supabase
        .from('approved_teachers')
        .select('email')
        .eq('email', email)
        .maybeSingle();

      if (existing) {
        results.skipped.push({ email, reason: 'Already in approved list' });
        continue;
      }

      // Add to approved teachers list
      const { error: insertError } = await supabase
        .from('approved_teachers')
        .insert({
          email,
          full_name: name,
          added_by: user.id,
          created_at: new Date().toISOString()
        });

      if (insertError) {
        results.failed.push({ email, error: insertError.message });
        continue;
      }

      results.added.push({ email, name });
    }

    return NextResponse.json({
      message: `Added ${results.added.length} teachers to approved list`,
      results
    });

  } catch (error) {
    console.error('Add approved teachers error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to list approved teachers
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin access
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_admin')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'teacher' || !profile.is_admin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all approved teachers
    const { data: approvedTeachers, error } = await supabase
      .from('approved_teachers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch approved teachers' }, { status: 500 });
    }

    // Get actual teacher accounts that have been created
    const { data: actualTeachers } = await supabase
      .from('profiles')
      .select('id, email, full_name, is_admin, created_at')
      .eq('role', 'teacher')
      .order('created_at', { ascending: false });

    return NextResponse.json({
      approved: approvedTeachers || [],
      teachers: actualTeachers || []
    });

  } catch (error) {
    console.error('List approved teachers error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
