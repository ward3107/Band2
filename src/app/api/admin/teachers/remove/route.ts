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

  if (!id) {
    return NextResponse.json({ error: 'Teacher ID required' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('approved_teachers')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Failed to remove teacher' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
