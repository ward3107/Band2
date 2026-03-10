import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getServerAdminEmail } from '@/lib/admin';
import { isIPWhitelisted, isIPWhitelistEnabled } from '@/lib/ip-whitelist';

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Service role client to bypass RLS (only used AFTER auth verification)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Rate limiting configuration
const RATE_LIMIT = 10; // Max requests per window
const RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// In-memory rate limit store (for production, use Redis or similar)
interface RateLimitEntry {
  count: number;
  resetTime: number;
}
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000); // Clean every minute

/**
 * Check rate limit for a given identifier
 * @returns true if rate limited, false otherwise
 */
function checkRateLimit(identifier: string): { limited: boolean; resetTime?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || now > entry.resetTime) {
    // First request or window expired - create new entry
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + RATE_WINDOW_MS,
    });
    return { limited: false };
  }

  if (entry.count >= RATE_LIMIT) {
    // Rate limit exceeded
    return { limited: true, resetTime: entry.resetTime };
  }

  // Increment counter
  entry.count++;
  return { limited: false };
}

export async function POST(request: NextRequest) {
  // Get client IP for rate limiting
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             request.headers.get('x-real-ip') ||
             'unknown';

  // Check IP whitelist (if enabled) - only for admin profile setup
  if (isIPWhitelistEnabled() && !isIPWhitelisted(ip, process.env.ADMIN_IP_WHITELIST)) {
    return NextResponse.json({
      error: 'Access Denied',
      message: 'Admin access is restricted to specific IP addresses',
    }, { status: 403 });
  }

  // Check rate limit
  const rateLimit = checkRateLimit(ip);
  if (rateLimit.limited) {
    return NextResponse.json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
    }, {
      status: 429,
      headers: {
        'X-RateLimit-Limit': RATE_LIMIT.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(rateLimit.resetTime!).toISOString(),
        'Retry-After': Math.ceil((rateLimit.resetTime! - Date.now()) / 1000).toString(),
      },
    });
  }

  try {
    const { userId, email } = await request.json();

    if (!userId || !email) {
      return NextResponse.json({ error: 'Missing userId or email' }, { status: 400 });
    }

    // AUTHENTICATION CHECK: Verify the user is authenticated before using service role
    const cookieStore = await cookies();
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: {
          getItem: async (key: string) => {
            const cookie = cookieStore.get(key);
            return cookie?.value ?? null;
          },
          setItem: () => {},
          removeItem: () => {},
        },
      },
    });

    // Verify the user's session
    const { data: { session }, error: sessionError } = await supabaseAuth.auth.getSession();

    if (sessionError || !session || !session.user) {
      return NextResponse.json({
        error: 'Unauthorized',
        message: 'You must be logged in to perform this action',
      }, { status: 401 });
    }

    // CRITICAL: Ensure the userId in the request matches the authenticated user
    if (session.user.id !== userId) {
      return NextResponse.json({
        error: 'Forbidden',
        message: 'You can only set up your own profile',
      }, { status: 403 });
    }

    // Verify the email matches the authenticated user's email
    const sessionEmail = session.user.email?.toLowerCase();
    const requestEmail = email.toLowerCase();

    if (sessionEmail !== requestEmail) {
      return NextResponse.json({
        error: 'Forbidden',
        message: 'Email mismatch',
      }, { status: 403 });
    }

    // Authentication verified - now safe to use service role key
    // Check if this is the admin email (for role assignment)
    const isAdminEmail = email.toLowerCase() === getServerAdminEmail().toLowerCase();

    // Check if profile exists using service role
    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('id, is_admin, role')
      .eq('id', userId)
      .maybeSingle();

    if (existing) {
      // Profile exists - for OAuth, automatically grant admin access if it's the admin email
      if (isAdminEmail && !existing.is_admin) {
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ role: 'teacher', is_admin: true })
          .eq('id', userId);

        if (updateError) {
          console.error('Profile update error:', updateError);
          return NextResponse.json({ error: 'Failed to update profile', details: updateError.message }, { status: 500 });
        }
      } else if (isAdminEmail && existing.role !== 'teacher') {
        // Update role if needed but admin already set
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ role: 'teacher' })
          .eq('id', userId);

        if (updateError) {
          console.error('Profile update error:', updateError);
          return NextResponse.json({ error: 'Failed to update profile', details: updateError.message }, { status: 500 });
        }
      }
    } else {
      // Create new profile - for OAuth, automatically grant admin access if it's the admin email
      const { error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          email: email,
          full_name: email.split('@')[0],
          role: isAdminEmail ? 'teacher' : 'student',
          is_admin: isAdminEmail, // Auto-grant admin for OAuth
        });

      if (insertError) {
        console.error('Profile insert error:', insertError);
        return NextResponse.json({ error: 'Failed to create profile', details: insertError.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      isAdmin: isAdminEmail,
      isPendingAdmin: false,
      message: isAdminEmail
        ? 'Admin access granted via Google authentication.'
        : 'Profile created successfully'
    });

  } catch (error: any) {
    console.error('Admin setup error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
