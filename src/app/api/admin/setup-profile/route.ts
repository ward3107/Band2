import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * ============================================
 * ADMIN PROFILE SETUP API
 * ============================================
 *
 * WHY: This API creates/updates the admin profile using the service role key
 * This bypasses RLS which might be causing recursion issues
 *
 * SECURITY:
 * - Only works for the ADMIN_EMAIL defined in environment
 * - Requires valid authentication token
 * ============================================
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

export async function POST(request: NextRequest) {
  try {
    // Check service role key is available
    if (!supabaseServiceKey) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set - admin cannot be created');
      return NextResponse.json({
        error: 'SUPABASE_SERVICE_ROLE_KEY not configured on server. Please add it to Vercel environment variables.',
        code: 'MISSING_SERVICE_KEY'
      }, { status: 500 });
    }

    // Check admin email is configured
    if (!adminEmail) {
      console.error('❌ NEXT_PUBLIC_ADMIN_EMAIL not set');
      return NextResponse.json({
        error: 'NEXT_PUBLIC_ADMIN_EMAIL not configured on server.',
        code: 'MISSING_ADMIN_EMAIL'
      }, { status: 500 });
    }

    // Get request body
    const { userId, email } = await request.json();

    if (!userId || !email) {
      return NextResponse.json({ error: 'Missing userId or email' }, { status: 400 });
    }

    // SECURITY: Verify this is the admin email
    if (email.toLowerCase() !== adminEmail?.toLowerCase()) {
      return NextResponse.json({ error: 'Unauthorized - not admin' }, { status: 403 });
    }

    // Verify auth token
    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!accessToken) {
      return NextResponse.json({ error: 'Missing auth token' }, { status: 401 });
    }

    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify the token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);

    if (authError || !user || user.id !== userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if profile exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (existingProfile) {
      // Update existing profile to be admin
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          is_admin: true,
          role: 'teacher',
          last_login: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating admin profile:', updateError);
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
      }

      return NextResponse.json({ success: true, isAdmin: true, action: 'updated' });
    } else {
      // Create new admin profile
      const { error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          email: email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0],
          role: 'teacher',
          is_admin: true,
        });

      if (insertError) {
        console.error('Error creating admin profile:', insertError);
        return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
      }

      return NextResponse.json({ success: true, isAdmin: true, action: 'created' });
    }

  } catch (error: any) {
    console.error('Admin setup error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
