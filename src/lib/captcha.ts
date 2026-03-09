/**
 * reCAPTCHA Utilities
 *
 * Handles CAPTCHA validation for spam and brute force prevention.
 *
 * @see https://www.google.com/recaptcha/about/
 */

export interface CaptchaConfig {
  siteKey: string;
  secretKey: string;
  minScore?: number; // For v3: 0.0 - 1.0, default 0.5
}

export interface CaptchaVerifyResult {
  success: boolean;
  score?: number;
  challenge_ts?: string;
  hostname?: string;
  error?: string;
}

/**
 * Get reCAPTCHA site key from environment
 */
export function getRecaptchaSiteKey(): string {
  return process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';
}

/**
 * Verify reCAPTCHA token server-side
 */
export async function verifyRecaptchaToken(
  token: string,
  secretKey: string,
  remoteIp?: string
): Promise<CaptchaVerifyResult> {
  const verifyUrl = 'https://www.google.com/recaptcha/api/siteverify';

  const params = new URLSearchParams({
    secret: secretKey,
    response: token,
  });

  if (remoteIp) {
    params.append('remoteip', remoteIp);
  }

  try {
    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json();

    return {
      success: data.success,
      score: data.score,
      challenge_ts: data.challenge_ts,
      hostname: data.hostname,
      error: data['error-codes']?.[0],
    };
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return {
      success: false,
      error: 'Failed to verify CAPTCHA',
    };
  }
}

/**
 * Check if CAPTCHA should be required based on failed attempts
 */
export function shouldRequireCaptcha(failedAttempts: number, threshold: number = 3): boolean {
  return failedAttempts >= threshold;
}
