import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export interface AdminAuthSuccess {
  userId: string;
  supabaseAdmin: SupabaseClient;
  errorResponse: null;
}

export interface AdminAuthFailure {
  userId: null;
  supabaseAdmin: null;
  errorResponse: NextResponse;
}

export type AdminAuthResult = AdminAuthSuccess | AdminAuthFailure;

/**
 * Verifies that the incoming request carries a valid Bearer token belonging
 * to a teacher with `is_admin = true`.  Returns a ready-to-use service-role
 * Supabase client on success, or a pre-built error NextResponse on failure.
 */
export async function verifyAdminAuth(request: NextRequest): Promise<AdminAuthResult> {
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      userId: null,
      supabaseAdmin: null,
      errorResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const token = authHeader.substring(7);
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    return {
      userId: null,
      supabaseAdmin: null,
      errorResponse: NextResponse.json({ error: 'Invalid token' }, { status: 401 }),
    };
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, is_admin')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'teacher' || !profile.is_admin) {
    return {
      userId: null,
      supabaseAdmin: null,
      errorResponse: NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 }),
    };
  }

  return { userId: user.id, supabaseAdmin, errorResponse: null };
}
