import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side only - NOT exposed to browser
const ADMIN_EMAIL = process.env.ADMIN_EMAIL!;

export async function POST(request: NextRequest) {
  try {
    // Require a valid Bearer token to prevent unauthenticated enumeration
    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the token is valid
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { error: tokenError } = await supabaseAdmin.auth.getUser(accessToken);
    if (tokenError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const isAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    // For security, don't reveal the actual admin email
    return NextResponse.json({ isAdmin });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
