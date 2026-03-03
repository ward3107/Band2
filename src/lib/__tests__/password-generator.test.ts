import { generateStrongPassword, generatePIN, parseTeacherData } from '../password-generator';

// ─── generateStrongPassword ────────────────────────────────────────────────

describe('generateStrongPassword', () => {
  it('returns the default length of 12', () => {
    expect(generateStrongPassword()).toHaveLength(12);
  });

  it('returns the specified length', () => {
    expect(generateStrongPassword(8)).toHaveLength(8);
    expect(generateStrongPassword(16)).toHaveLength(16);
    expect(generateStrongPassword(24)).toHaveLength(24);
  });

  it('contains at least one lowercase letter', () => {
    // Run several times to account for shuffling
    for (let i = 0; i < 10; i++) {
      expect(generateStrongPassword()).toMatch(/[a-z]/);
    }
  });

  it('contains at least one uppercase letter', () => {
    for (let i = 0; i < 10; i++) {
      expect(generateStrongPassword()).toMatch(/[A-Z]/);
    }
  });

  it('contains at least one digit', () => {
    for (let i = 0; i < 10; i++) {
      expect(generateStrongPassword()).toMatch(/[0-9]/);
    }
  });

  it('contains at least one special character', () => {
    for (let i = 0; i < 10; i++) {
      expect(generateStrongPassword()).toMatch(/[!@#$%^&*()\-_=+[\]{}|;:,.<>?]/);
    }
  });

  it('produces different values on successive calls (randomness)', () => {
    const results = new Set(Array.from({ length: 20 }, () => generateStrongPassword()));
    // With 20 calls and a 12-char password from a 90-char alphabet, collisions are
    // astronomically unlikely. If every call returns the same string, something is broken.
    expect(results.size).toBeGreaterThan(1);
  });

  it('only contains printable ASCII characters', () => {
    for (let i = 0; i < 20; i++) {
      const p = generateStrongPassword();
      expect(p).toMatch(/^[\x21-\x7E]+$/);
    }
  });
});

// ─── generatePIN ───────────────────────────────────────────────────────────

describe('generatePIN', () => {
  it('returns the default length of 6', () => {
    expect(generatePIN()).toHaveLength(6);
  });

  it('returns the specified length', () => {
    expect(generatePIN(4)).toHaveLength(4);
    expect(generatePIN(8)).toHaveLength(8);
  });

  it('contains only digits', () => {
    for (let i = 0; i < 20; i++) {
      expect(generatePIN()).toMatch(/^\d+$/);
    }
  });

  it('produces different values on successive calls (randomness)', () => {
    const results = new Set(Array.from({ length: 20 }, () => generatePIN()));
    expect(results.size).toBeGreaterThan(1);
  });
});

// ─── parseTeacherData ──────────────────────────────────────────────────────

describe('parseTeacherData', () => {
  it('returns an empty array for empty input', () => {
    expect(parseTeacherData('')).toEqual([]);
  });

  it('returns an empty array for whitespace-only input', () => {
    expect(parseTeacherData('   \n  \n  ')).toEqual([]);
  });

  it('parses a single email with no name', () => {
    const result = parseTeacherData('jane@example.com');
    expect(result).toHaveLength(1);
    expect(result[0].email).toBe('jane@example.com');
    expect(result[0].name).toBe('jane');
  });

  it('uses the local part of the address as name for single-column format', () => {
    const result = parseTeacherData('teacher.smith@school.edu');
    expect(result[0].name).toBe('teacher.smith');
  });

  it('parses name,email CSV format', () => {
    const result = parseTeacherData('John Smith, john@example.com');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ name: 'John Smith', email: 'john@example.com' });
  });

  it('parses multiple lines', () => {
    const input = 'Alice, alice@example.com\nBob, bob@example.com\ncarol@example.com';
    const result = parseTeacherData(input);
    expect(result).toHaveLength(3);
    expect(result[0].email).toBe('alice@example.com');
    expect(result[1].email).toBe('bob@example.com');
    expect(result[2].email).toBe('carol@example.com');
  });

  it('skips header rows containing the word "email"', () => {
    const input = 'Name, Email\nJohn, john@example.com';
    const result = parseTeacherData(input);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('John');
  });

  it('skips header rows containing the word "name"', () => {
    const input = 'name,email\nalice@example.com';
    const result = parseTeacherData(input);
    expect(result).toHaveLength(1);
  });

  it('skips lines without an @ symbol', () => {
    const input = 'not-an-email\nvalid@example.com\nanother-bad-line';
    const result = parseTeacherData(input);
    expect(result).toHaveLength(1);
    expect(result[0].email).toBe('valid@example.com');
  });

  it('skips blank lines between entries', () => {
    const input = 'alice@example.com\n\n\nbob@example.com';
    const result = parseTeacherData(input);
    expect(result).toHaveLength(2);
  });

  it('uses name from CSV even when it is short', () => {
    const result = parseTeacherData('Al, al@example.com');
    expect(result[0].name).toBe('Al');
  });

  it('handles CSV rows with more than two columns by using first two', () => {
    // Third column should be silently ignored
    const result = parseTeacherData('Jane, jane@example.com, extraData');
    expect(result).toHaveLength(1);
    expect(result[0].email).toBe('jane@example.com');
  });
});
