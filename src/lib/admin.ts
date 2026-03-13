/**
 * Admin configuration
 *
 * PRODUCTION: The admin email is now server-side only.
 * Use /api/admin/validate-email to check if an email is admin.
 *
 * For client-side code, use the helper function below:
 */

/**
 * Check if an email is the admin email
 * @returns Promise<{ isAdmin: boolean }>
 */
export async function validateAdminEmail(email: string, accessToken?: string): Promise<{ isAdmin: boolean }> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch('/api/admin/validate-email', {
      method: 'POST',
      headers,
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      return { isAdmin: false };
    }

    return await response.json();
  } catch {
    return { isAdmin: false };
  }
}

/**
 * Server-side admin email (for API routes only)
 * This is NOT available in client-side code
 */
export function getServerAdminEmail(): string {
  if (typeof window !== 'undefined') {
    throw new Error('getServerAdminEmail can only be used on the server');
  }
  return process.env.ADMIN_EMAIL || 'admin@example.com';
}
