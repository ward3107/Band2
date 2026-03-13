import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerAdminEmail } from '@/lib/admin';
import { verifyRecaptchaToken } from '@/lib/captcha';
import { isIPWhitelisted, isIPWhitelistEnabled } from '@/lib/ip-whitelist';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY || '';

// Rate limiting for password verification (more restrictive)
const RATE_LIMIT = 5; // Max attempts per window
const RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const CAPTCHA_THRESHOLD = 3; // Require CAPTCHA after this many failed attempts

interface RateLimitEntry {
  count: number;
  resetTime: number;
  failedAttempts: number; // Track failures for CAPTCHA requirement
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
}, 60 * 1000);

function checkRateLimit(identifier: string): {
  limited: boolean;
  resetTime?: number;
  requiresCaptcha: boolean;
  failedAttempts: number;
} {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + RATE_WINDOW_MS,
      failedAttempts: 0,
    });
    return { limited: false, requiresCaptcha: false, failedAttempts: 0 };
  }

  if (entry.count >= RATE_LIMIT) {
    return {
      limited: true,
      resetTime: entry.resetTime,
      requiresCaptcha: true,
      failedAttempts: entry.failedAttempts,
    };
  }

  entry.count++;
  return {
    limited: false,
    requiresCaptcha: entry.failedAttempts >= CAPTCHA_THRESHOLD,
    failedAttempts: entry.failedAttempts,
  };
}

function recordFailedAttempt(identifier: string): void {
  const entry = rateLimitStore.get(identifier);
  if (entry) {
    entry.failedAttempts++;
  }
}

function recordSuccessfulAttempt(identifier: string): void {
  const entry = rateLimitStore.get(identifier);
  if (entry) {
    entry.failedAttempts = 0; // Reset on success
  }
}

export async function POST(request: NextRequest) {
  // Get client IP for rate limiting
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             request.headers.get('x-real-ip') ||
             'unknown';

  // Check IP whitelist (if enabled)
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
      error: 'Too many attempts',
      message: 'Too many failed attempts. Please try again later.',
    }, {
      status: 429,
      headers: {
        'Retry-After': Math.ceil((rateLimit.resetTime! - Date.now()) / 1000).toString(),
      },
    });
  }

  try {
    const { password, recaptchaToken } = await request.json();

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    // Check if CAPTCHA is required and validate it
    if (rateLimit.requiresCaptcha) {
      if (!recaptchaToken) {
        recordFailedAttempt(ip);
        return NextResponse.json({
          error: 'CAPTCHA required',
          message: 'Please complete the CAPTCHA verification',
          requiresCaptcha: true,
          failedAttempts: rateLimit.failedAttempts + 1,
        }, { status: 403 });
      }

      if (!RECAPTCHA_SECRET_KEY) {
        return NextResponse.json({
          error: 'Configuration error',
          message: 'CAPTCHA not configured on server',
        }, { status: 500 });
      }

      const captchaResult = await verifyRecaptchaToken(recaptchaToken, RECAPTCHA_SECRET_KEY, ip);

      if (!captchaResult.success) {
        recordFailedAttempt(ip);
        return NextResponse.json({
          error: 'CAPTCHA verification failed',
          message: captchaResult.error || 'Invalid CAPTCHA',
          requiresCaptcha: true,
          failedAttempts: rateLimit.failedAttempts + 1,
        }, { status: 403 });
      }

      // Optional: Check score for reCAPTCHA v3 (0.0 - 1.0)
      if (captchaResult.score !== undefined && captchaResult.score < 0.3) {
        recordFailedAttempt(ip);
        return NextResponse.json({
          error: 'CAPTCHA score too low',
          message: 'Please try again',
          requiresCaptcha: true,
          failedAttempts: rateLimit.failedAttempts + 1,
        }, { status: 403 });
      }
    }

    // Verify user is authenticated via Bearer token
    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!accessToken) {
      return NextResponse.json({
        error: 'Unauthorized',
        message: 'You must be logged in',
      }, { status: 401 });
    }

    const supabaseAdminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user: tokenUser }, error: tokenError } = await supabaseAdminClient.auth.getUser(accessToken);

    if (tokenError || !tokenUser) {
      return NextResponse.json({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      }, { status: 401 });
    }

    // Verify this is the admin email
    if (tokenUser.email?.toLowerCase() !== getServerAdminEmail().toLowerCase()) {
      return NextResponse.json({
        error: 'Forbidden',
        message: 'Only the administrator can perform this action',
      }, { status: 403 });
    }

    // Verify password by attempting to sign in with email and password
    const verifyClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: signInData, error: signInError } = await verifyClient.auth.signInWithPassword({
      email: getServerAdminEmail(),
      password,
    });

    if (signInError || !signInData.user) {
      recordFailedAttempt(ip);
      const newRateLimit = checkRateLimit(ip);
      return NextResponse.json({
        error: 'Invalid password',
        message: 'The password you entered is incorrect',
        requiresCaptcha: newRateLimit.requiresCaptcha,
        failedAttempts: newRateLimit.failedAttempts,
      }, { status: 401 });
    }

    // Password verified - now grant admin access via service role
    const { error: updateError } = await supabaseAdminClient
      .from('profiles')
      .update({ is_admin: true })
      .eq('id', tokenUser.id);

    if (updateError) {
      console.error('Failed to grant admin access:', updateError);
      return NextResponse.json({
        error: 'Failed to grant admin access',
        message: 'Please try again',
      }, { status: 500 });
    }

    recordSuccessfulAttempt(ip);

    return NextResponse.json({
      success: true,
      message: 'Admin access granted',
    });

  } catch (error: any) {
    console.error('Admin verification error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: 'Please try again',
    }, { status: 500 });
  }
}
