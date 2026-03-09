import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

/**
 * CSRF Protection Middleware
 *
 * Generates and validates CSRF tokens for state-changing operations.
 *
 * @see https://owasp.org/www-community/attacks/csrf
 */

// Routes that require CSRF protection (state-changing operations)
const PROTECTED_ROUTES = [
  '/api/admin/setup-profile',
  '/api/admin/verify-password',
  '/api/auth/logout',
  '/api/profile',
];

// Routes that are exempt from CSRF check (e.g., webhook endpoints, public endpoints)
const EXEMPT_ROUTES = [
  '/api/auth/callback',
  '/api/admin/setup-profile', // OAuth callback needs to create profile
];

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route => pathname.startsWith(route));
}

function isExemptRoute(pathname: string): boolean {
  return EXEMPT_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * Generate a random CSRF token
 */
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify CSRF token for non-GET requests
 */
async function verifyCsrfToken(request: NextRequest): Promise<boolean> {
  const cookieStore = await cookies();
  const csrfCookie = cookieStore.get('csrf_token');

  // Get token from header or form data
  const headerToken = request.headers.get('x-csrf-token');
  const contentType = request.headers.get('content-type') || '';

  let bodyToken: string | null = null;

  // Parse token from body based on content type
  if (contentType.includes('application/json')) {
    try {
      const cloned = request.clone();
      const body = await cloned.json();
      bodyToken = body.csrf_token;
    } catch {
      // Invalid JSON, continue
    }
  } else if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
    try {
      const cloned = request.clone();
      const formData = await cloned.formData();
      bodyToken = formData.get('csrf_token') as string;
    } catch {
      // Invalid form data, continue
    }
  }

  const submittedToken = headerToken || bodyToken;

  if (!csrfCookie?.value || !submittedToken) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  // timingSafeEqual is not available in all environments, so we implement our own
  return constantTimeEqual(csrfCookie.value, submittedToken);
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;

  // Set security headers for all responses
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // CSRF protection for non-GET requests to protected routes
  const isNonGetRequest = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);

  if (isNonGetRequest && isProtectedRoute(pathname) && !isExemptRoute(pathname)) {
    const isValid = await verifyCsrfToken(request);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid CSRF token', message: 'Security validation failed' },
        { status: 403 }
      );
    }
  }

  // Generate/set CSRF token for safe methods
  const cookieStore = await cookies();
  const existingCsrfCookie = cookieStore.get('csrf_token');

  if (!existingCsrfCookie) {
    const token = generateToken();
    response.cookies.set('csrf_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });
  }

  // Expose CSRF token to client via header (for JavaScript access)
  const csrfToken = existingCsrfCookie?.value ||
    response.cookies.get('csrf_token')?.value ||
    '';
  response.headers.set('X-CSRF-Token', csrfToken);

  return response;
}

export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
    // Match protected pages
    '/admin/:path*',
  ],
};
