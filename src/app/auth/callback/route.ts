import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  console.log('OAuth callback:', { hasCode: !!code, error })

  if (error) {
    return NextResponse.redirect(new URL('/?error=' + encodeURIComponent(errorDescription || error), requestUrl.origin))
  }

  if (code) {
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey)
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error('Code exchange error:', exchangeError)
        return NextResponse.redirect(new URL('/?error=' + encodeURIComponent(exchangeError.message), requestUrl.origin))
      }

      const user = data.session?.user
      console.log('Session created for user:', user?.email)

      if (user) {
        // Try to get profile, but don't fail if it doesn't exist
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle() // Use maybeSingle to avoid error if not found

        console.log('Profile check:', { hasProfile: !!profile, hasRole: !!profile?.role, role: profile?.role, profileError })

        let redirectUrl = '/auth/complete-profile' // Default to complete profile for new Google users

        if (profile?.role) {
          // User has a role, redirect appropriately
          redirectUrl = profile.role === 'teacher' ? '/teacher/dashboard' : '/student'
        }

        // Create response with session info for client to pick up
        const response = NextResponse.redirect(new URL(redirectUrl, requestUrl.origin))

        // Set session data in cookie for client
        if (data.session) {
          response.cookies.set('supabase-session', JSON.stringify({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            user: data.session.user
          }), {
            httpOnly: false,
            path: '/',
            maxAge: 60 * 5,
            sameSite: 'lax'
          })
        }

        return response
      }
    } catch (err) {
      console.error('Callback error:', err)
      return NextResponse.redirect(new URL('/?error=callback_failed', requestUrl.origin))
    }
  }

  return NextResponse.redirect(new URL('/', requestUrl.origin))
}
