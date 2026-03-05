import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { checkRateLimit } from '@/lib/rate-limit';

export async function DELETE(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  if (!checkRateLimit(`remove-teacher:${ip}`, { maxRequests: 20, windowMs: 60_000 })) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const auth = await verifyAdminAuth(request);
  if (auth.errorResponse) return auth.errorResponse;
  const { supabaseAdmin } = auth;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const type = searchParams.get('type') || 'approved'; // 'approved' or 'code'

  if (!id) {
    return NextResponse.json({ error: 'Teacher ID required' }, { status: 400 });
  }

  if (type === 'code') {
    // Code-based teacher: delete profile and auth user
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', id);

    if (profileError) {
      return NextResponse.json({ error: 'Failed to remove teacher profile' }, { status: 500 });
    }

    // Also delete the auth user
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (authError) {
      // Profile already deleted, log but don't fail
      console.error('Failed to delete auth user:', authError.message);
    }

    return NextResponse.json({ success: true });
  }

  // Google-based teacher: delete from approved_teachers
  const { error } = await supabaseAdmin
    .from('approved_teachers')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Failed to remove teacher' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
