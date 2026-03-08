import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Admin email - must match to grant admin access
const ADMIN_EMAIL = 'wasya92@gmail.com';

// Use service role client to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const { userId, email } = await request.json();

    if (!userId || !email) {
      return NextResponse.json({ error: 'Missing userId or email' }, { status: 400 });
    }

    // Only grant admin to the specific email
    const isAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    // Check if profile exists using service role
    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('id, is_admin')
      .eq('id', userId)
      .maybeSingle();

    if (existing) {
      // Update is_admin if not already set
      if (!existing.is_admin && isAdmin) {
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ is_admin: true })
          .eq('id', userId);

        if (updateError) {
          console.error('Profile update error:', updateError);
          return NextResponse.json({ error: 'Failed to update profile', details: updateError.message }, { status: 500 });
        }
      }
    } else {
      // Create new profile with admin status using service role
      const { error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          email: email,
          full_name: email.split('@')[0],
          role: 'teacher',
          is_admin: isAdmin,
        });

      if (insertError) {
        console.error('Profile insert error:', insertError);
        return NextResponse.json({ error: 'Failed to create profile', details: insertError.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      isAdmin,
      message: isAdmin ? 'Admin access granted' : 'Access denied'
    });

  } catch (error: any) {
    console.error('Admin setup error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
