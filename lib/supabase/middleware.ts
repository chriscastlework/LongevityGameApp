import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/types/database'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Create Supabase client with cookies from request
  const cookieString = request.headers.get('cookie') || ''
  
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storage: {
          getItem: (key: string) => {
            const match = cookieString.match(new RegExp(`${key}=([^;]+)`))
            return match ? decodeURIComponent(match[1]) : null
          },
          setItem: (key: string, value: string) => {
            supabaseResponse.cookies.set(key, value, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              path: '/'
            })
          },
          removeItem: (key: string) => {
            supabaseResponse.cookies.delete(key)
          },
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes that require authentication
  const protectedPaths = [
    '/competitions',
    '/competitions/create',
    '/competitions/manage',
    '/profile',
    '/settings',
    '/dashboard'
  ]

  // Competition entry pages that might require auth
  const competitionEntryPaths = [
    '/competition',
    '/competitions'
  ]

  const url = request.nextUrl.clone()
  const pathname = url.pathname

  // Check if this is a protected path
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))
  
  // Check if this is a competition entry that requires auth
  const isCompetitionEntry = pathname.includes('/enter') && competitionEntryPaths.some(path => pathname.startsWith(path))

  if ((isProtectedPath || isCompetitionEntry) && !user) {
    // Redirect to login with the current path as redirect parameter
    const loginUrl = url.clone()
    loginUrl.pathname = '/auth/login'
    loginUrl.searchParams.set('redirect', pathname + url.search)
    
    return NextResponse.redirect(loginUrl)
  }

  // Auth pages - redirect if already authenticated
  const authPaths = ['/auth/login', '/auth/signup']
  if (authPaths.some(path => pathname.startsWith(path)) && user) {
    const redirectParam = url.searchParams.get('redirect')
    const redirectTo = redirectParam && redirectParam.startsWith('/') ? redirectParam : '/competitions'
    
    const redirectUrl = url.clone()
    redirectUrl.pathname = redirectTo
    redirectUrl.search = '' // Clear query params
    
    return NextResponse.redirect(redirectUrl)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}