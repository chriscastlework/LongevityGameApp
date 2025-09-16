import { createServerClient as createSupabaseServerClient, serializeCookieHeader } from '@supabase/ssr'
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from 'next/server'
import type { Database } from "@/lib/types/database";

// Server client for API routes with proper cookie handling
export async function createRouteHandlerClient() {
  const cookieStore = await cookies();

  return createSupabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: Array<{name: string, value: string, options: any}>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch (error) {
            // This can fail in middleware or some server environments
          }
        }
      }
    }
  )
}

// Server client for Server Components
export async function createServerClient() {
  return createRouteHandlerClient();
}

// Server client for middleware/request-response cycle
export function createMiddlewareClient(
  request: NextRequest,
  response: NextResponse
) {
  return createSupabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Array<{name: string, value: string, options: any}>) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const cookieString = serializeCookieHeader(name, value, options)
            response.headers.append('Set-Cookie', cookieString)
          })
        }
      }
    }
  )
}

// Admin client with service role key for database operations
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createSupabaseClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Regular client for user authentication (uses anon key)
export async function createAuthClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey);
}

// Alias for backward compatibility - use createRouteHandlerClient instead
export const createClient = createRouteHandlerClient;
