/**
 * IP Whitelist Utilities
 *
 * Validates IP addresses against a whitelist for admin access.
 * Supports single IPs, CIDR ranges, and wildcards.
 *
 * @example
 * // .env
 * ADMIN_IP_WHITELIST=192.168.1.1,10.0.0.0/24,203.0.113.*
 */

/**
 * Parse CIDR notation to get network and mask
 */
function parseCIDR(cidr: string): { network: string; mask: number } | null {
  const [network, maskStr] = cidr.split('/');
  const mask = parseInt(maskStr, 10);

  if (isNaN(mask) || mask < 0 || mask > 32) {
    return null;
  }

  return { network, mask };
}

/**
 * Convert IP string to 32-bit integer
 */
function ipToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;

  return parts.reduce((acc, part) => {
    const num = parseInt(part, 10);
    if (isNaN(num) || num < 0 || num > 255) return 0;
    return (acc << 8) + num;
  }, 0) >>> 0;
}

/**
 * Check if IP matches CIDR range
 */
function matchCIDR(ip: string, cidr: string): boolean {
  const parsed = parseCIDR(cidr);
  if (!parsed) return false;

  const ipInt = ipToInt(ip);
  const networkInt = ipToInt(parsed.network);

  if (ipInt === null || networkInt === null) return false;

  const mask = (0xFFFFFFFF << (32 - parsed.mask)) >>> 0;
  return (ipInt & mask) === (networkInt & mask);
}

/**
 * Check if IP matches wildcard pattern (e.g., 192.168.1.*)
 */
function matchWildcard(ip: string, pattern: string): boolean {
  const regex = new RegExp(
    '^' +
    pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '\\d{1,3}')
      .replace(/\?/g, '\\d{1}') +
    '$'
  );
  return regex.test(ip);
}

/**
 * Check if IP is in whitelist
 * @param ip - IP address to check
 * @param whitelist - Comma-separated list of IPs, CIDR ranges, and wildcards
 * @returns true if IP is allowed
 */
export function isIPWhitelisted(
  ip: string,
  whitelist: string | undefined
): boolean {
  // If whitelist is not configured or empty, allow all (feature disabled)
  if (!whitelist || whitelist.trim() === '') {
    return true;
  }

  // Normalize IP
  const normalizedIP = ip.trim();

  const allowedEntries = whitelist.split(',').map(s => s.trim()).filter(Boolean);

  for (const entry of allowedEntries) {
    // CIDR notation (e.g., 192.168.0.0/24)
    if (entry.includes('/')) {
      if (matchCIDR(normalizedIP, entry)) {
        return true;
      }
    }
    // Wildcard notation (e.g., 192.168.1.*)
    else if (entry.includes('*') || entry.includes('?')) {
      if (matchWildcard(normalizedIP, entry)) {
        return true;
      }
    }
    // Exact IP match
    else {
      if (normalizedIP === entry) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Get whitelist configuration from environment
 */
export function getAdminIPWhitelist(): string {
  return process.env.ADMIN_IP_WHITELIST || '';
}

/**
 * Check if IP whitelist enforcement is enabled
 */
export function isIPWhitelistEnabled(): boolean {
  const whitelist = getAdminIPWhitelist();
  return whitelist.trim() !== '';
}

/**
 * Validate an IP address format
 */
export function isValidIP(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;

  return parts.every(part => {
    const num = parseInt(part, 10);
    return !isNaN(num) && num >= 0 && num <= 255;
  });
}

/**
 * Extract client IP from request headers
 */
export function getClientIP(request: Request): string {
  // Check various headers for the real IP
  const headers = new Headers(request.headers);

  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') || // Cloudflare
    headers.get('x-client-ip') ||
    'unknown'
  );
}
