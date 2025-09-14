import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  
  try {
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('Logout error:', error)
      return NextResponse.redirect(new URL('/?error=logout-failed', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'))
    }

    // Redirect to home page after successful logout
    return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'))
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.redirect(new URL('/?error=logout-failed', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'))
  }
}