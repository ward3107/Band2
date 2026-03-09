import { NextRequest, NextResponse } from 'next/server';

// Server-side only - NOT exposed to browser
const ADMIN_EMAIL = process.env.ADMIN_EMAIL!;

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const isAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    // For security, don't reveal the actual admin email
    return NextResponse.json({ isAdmin });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
