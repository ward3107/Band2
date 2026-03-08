import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export async function GET() {
  const manifest = {
    name: 'Vocaband',
    short_name: 'Vocaband',
    description: 'Learn English vocabulary for grades 7-9 with translations in Hebrew and Arabic',
    start_url: '/',
    display: 'standalone' as const,
    background_color: '#ffffff',
    theme_color: '#2563eb',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon'
      }
    ]
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  });
}
