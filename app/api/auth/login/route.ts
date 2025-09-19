import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient, createAdminClient } from "@/lib/supabase/server";

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: "Missing required fields", details: "Email and password are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Create client for login
    const supabase = await createRouteHandlerClient();

    console.log("Attempting login for:", email);

    // Authenticate user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.error("Login error:", authError);

      // Return appropriate error based on auth error
      if (authError.message.includes("Invalid login credentials")) {
        return NextResponse.json(
          { error: "Invalid credentials", details: "Email or password is incorrect" },
          { status: 401 }
        );
      }

      if (authError.message.includes("Email not confirmed")) {
        return NextResponse.json(
          { error: "Email not confirmed", details: "Please check your email and click the confirmation link" },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: "Login failed", details: authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Login failed", details: "No user returned" },
        { status: 500 }
      );
    }

    console.log("User authenticated:", authData.user.id);

    // Get user profile and participant data in a single optimized query
    try {
      // Use a single query with join to fetch both profile and participant data
      const { data: userDataResult, error: fetchError } = await supabase
        .from("profiles")
        .select(`
          *,
          participants (*)
        `)
        .eq("id", authData.user.id)
        .single();

      let profile = null;
      let participant = null;

      if (fetchError) {
        console.error("User data fetch error:", fetchError);
        // If profile doesn't exist, that's OK for now
      } else if (userDataResult) {
        profile = userDataResult;
        participant = userDataResult.participants?.[0] || null;
      }

      const duration = Date.now() - startTime;
      console.log(`Login successful for user: ${authData.user.id} (${duration}ms)`);

      // Set the session in cookies for the user
      const supabaseForSession = await createRouteHandlerClient();
      if (authData.session) {
        await supabaseForSession.auth.setSession(authData.session);
      }

      // Return success response with user data and tokens
      return NextResponse.json({
        success: true,
        data: {
          user: {
            id: authData.user.id,
            email: authData.user.email,
            email_confirmed_at: authData.user.email_confirmed_at,
            last_sign_in_at: authData.user.last_sign_in_at,
          },
          profile: profile || null,
          participant: participant || null,
          session: {
            access_token: authData.session?.access_token,
            refresh_token: authData.session?.refresh_token,
            expires_at: authData.session?.expires_at,
            expires_in: authData.session?.expires_in,
          }
        },
        message: "Login successful",
      });

    } catch (error: any) {
      console.error("Profile/participant fetch failed:", error.message);

      // Set the session in cookies for the user even if profile fetch fails
      const supabaseForSession = await createRouteHandlerClient();
      if (authData.session) {
        await supabaseForSession.auth.setSession(authData.session);
      }

      // Still return successful login even if profile fetch fails
      return NextResponse.json({
        success: true,
        data: {
          user: {
            id: authData.user.id,
            email: authData.user.email,
            email_confirmed_at: authData.user.email_confirmed_at,
            last_sign_in_at: authData.user.last_sign_in_at,
          },
          profile: null,
          participant: null,
          session: {
            access_token: authData.session?.access_token,
            refresh_token: authData.session?.refresh_token,
            expires_at: authData.session?.expires_at,
            expires_in: authData.session?.expires_in,
          }
        },
        message: "Login successful (profile data unavailable)",
      });
    }

  } catch (error: any) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}