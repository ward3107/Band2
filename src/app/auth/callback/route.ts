import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Check if user has a complete profile with role
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // If profile doesn't exist or has no role, redirect to complete profile
    if (!profile || !profile.role) {
      return NextResponse.redirect(new URL('/auth/complete-profile', requestUrl.origin))
    }

    // Redirect based on role
    if (profile.role === 'teacher') {
      return NextResponse.redirect(new URL('/teacher/dashboard', requestUrl.origin))
    } else {
      return NextResponse.redirect(new URL('/student', requestUrl.origin))
    }
  }

  // Fallback to home
  return NextResponse.redirect(new URL('/', requestUrl.origin))
}
