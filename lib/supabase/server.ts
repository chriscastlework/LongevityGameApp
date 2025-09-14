import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

export async function createServerClient() {
  const cookieStore = await cookies()

  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: {
      storage: {
        getItem: (key: string) => {
          const cookie = cookieStore.get(key)
          return cookie?.value || null
        },
        setItem: (key: string, value: string) => {
          try {
            cookieStore.set(key, value, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: "lax",
              path: "/",
              maxAge: 60 * 60 * 24 * 7 // 7 days
            })
          } catch {
            // Ignore errors in server components
          }
        },
        removeItem: (key: string) => {
          try {
            cookieStore.delete(key)
          } catch {
            // Ignore errors in server components
          }
        },
      },
    },
  })
}

export const createClient = createServerClient
