import crypto from 'crypto';

/**
 * Generate a cryptographically secure random password
 * @param length Password length (default 12)
 * @returns Strong random password
 */
export function generateStrongPassword(length: number = 12): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  const all = lowercase + uppercase + numbers + special;

  // Ensure at least one character from each category
  let password = '';
  password += lowercase[crypto.randomInt(lowercase.length)];
  password += uppercase[crypto.randomInt(uppercase.length)];
  password += numbers[crypto.randomInt(numbers.length)];
  password += special[crypto.randomInt(special.length)];

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += all[crypto.randomInt(all.length)];
  }

  // Shuffle the password
  return password.split('').sort(() => crypto.randomInt(3) - 1).join('');
}

/**
 * Generate a simple numeric PIN (alternative option)
 * @param digits Number of digits (default 6)
 * @returns Numeric PIN
 */
export function generatePIN(digits: number = 6): string {
  let pin = '';
  for (let i = 0; i < digits; i++) {
    pin += crypto.randomInt(10);
  }
  return pin;
}

/**
 * Generate a unique 6-character teacher login code (uppercase letters + numbers)
 * Excludes visually similar characters (I, O, 0, 1)
 */
export function generateTeacherCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[crypto.randomInt(chars.length)];
  }
  return code;
}

/**
 * Parse CSV/Excel data for teacher import
 * Expected format: name,email or just email
 */
export function parseTeacherData(data: string): Array<{ name: string; email: string }> {
  const lines = data.split('\n').filter(line => line.trim());
  const teachers: Array<{ name: string; email: string }> = [];
  let isFirstLine = true;

  for (const line of lines) {
    // Skip header row only if the first line looks like a header (no @ sign = not data)
    if (isFirstLine) {
      isFirstLine = false;
      const lower = line.toLowerCase().trim();
      if (!line.includes('@') && (lower.startsWith('name') || lower.startsWith('email') || lower === 'name,email' || lower === 'email,name')) {
        continue;
      }
    }

    // Try CSV format first
    const parts = line.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      const [name, email] = parts;
      if (email && email.includes('@')) {
        teachers.push({ name: name || email.split('@')[0], email });
      }
    } else {
      // Single column - just email
      const email = line.trim();
      if (email.includes('@')) {
        teachers.push({ name: email.split('@')[0], email });
      }
    }
  }

  return teachers;
}
