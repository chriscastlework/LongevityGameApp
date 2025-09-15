import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, fullName } = body;

    // Basic validation
    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: "Missing required fields", details: "email, password, and fullName are required" },
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

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password too weak", details: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    console.log("Attempting simple signup for:", email);

    // Create a simple client with anon key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Try to create user without additional database operations
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (authError) {
      console.error("Simple signup error:", authError);

      if (authError.message.includes("User already registered")) {
        return NextResponse.json(
          { error: "User already exists", details: "An account with this email already exists" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Signup failed", details: authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Signup failed", details: "No user returned" },
        { status: 500 }
      );
    }

    console.log("Simple signup successful for user:", authData.user.id);

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: authData.user.id,
          email: authData.user.email,
          email_confirmed_at: authData.user.email_confirmed_at,
        },
        session: authData.session ? {
          access_token: authData.session.access_token,
          refresh_token: authData.session.refresh_token,
          expires_at: authData.session.expires_at,
          expires_in: authData.session.expires_in,
        } : null,
      },
      message: "Account created successfully. Please complete your profile.",
    });

  } catch (error: any) {
    console.error("Simple signup API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}