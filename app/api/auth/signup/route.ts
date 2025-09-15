import { NextRequest, NextResponse } from "next/server";
import {
  createRouteHandlerClient,
  createAdminClient,
} from "@/lib/supabase/server";
import type {
  SignupFormData,
  ParticipantProfileInsert,
} from "@/lib/types/database";

export async function POST(request: NextRequest) {
  try {
    const body: SignupFormData = await request.json();

    // Validate required fields
    const {
      fullName,
      email,
      password,
      dateOfBirth,
      gender,
      jobTitle,
      organization,
    } = body;

    if (
      !fullName ||
      !email ||
      !password ||
      !dateOfBirth ||
      !gender ||
      !jobTitle ||
      !organization
    ) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          details:
            "fullName, email, password, dateOfBirth, gender, jobTitle, and organization are required",
        },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        {
          error: "Password too weak",
          details: "Password must be at least 8 characters long",
        },
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

    // Validate gender
    if (!["male", "female"].includes(gender)) {
      return NextResponse.json(
        {
          error: "Invalid gender",
          details: "Gender must be 'male' or 'female'",
        },
        { status: 400 }
      );
    }

    // Create regular client for user creation (uses anon key)
    const supabase = await createRouteHandlerClient();

    // Create admin client for database operations
    const adminClient = createAdminClient();

    // Begin transaction-like operations
    console.log("Creating auth user...");

    // Step 1: Create auth user
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
      console.error("Auth signup error:", authError);

      // Handle specific signup errors
      if (authError.message.includes("User already registered")) {
        return NextResponse.json(
          {
            error: "User already exists",
            details: "An account with this email already exists",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Failed to create user account", details: authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        {
          error: "User creation failed",
          details: "No user returned from auth signup",
        },
        { status: 500 }
      );
    }

    console.log("Auth user created:", authData.user.id);

    try {
      // Step 2: Create profile record
      const profileData: ParticipantProfileInsert = {
        id: authData.user.id,
        name: fullName,
        email: email,
        date_of_birth: dateOfBirth,
        gender: gender as "male" | "female",
        job_title: jobTitle,
        organisation: organization, // Convert American to British spelling
        role: 'participant', // Default role for new signups
      };

      console.log("Creating profile...");
      const { data: profile, error: profileError } = await adminClient
        .from("profiles")
        .insert([profileData])
        .select()
        .single();

      if (profileError) {
        console.error("Profile creation error:", profileError);
        // Attempt to clean up auth user (though this might not work without admin auth API)
        throw new Error(`Profile creation failed: ${profileError.message}`);
      }

      console.log("Profile created:", profile?.id);

      // Step 3: Create participant record
      console.log("Creating participant...");
      const { data: participant, error: participantError } = await adminClient
        .from("participants")
        .insert([{ user_id: authData.user.id }])
        .select()
        .single();

      if (participantError) {
        console.error("Participant creation error:", participantError);
        // Clean up profile
        await adminClient.from("profiles").delete().eq("id", authData.user.id);
        throw new Error(
          `Participant creation failed: ${participantError.message}`
        );
      }

      console.log("Participant created:", participant?.id);

      // Set the session in cookies for the user
      const supabaseForSession = await createRouteHandlerClient();
      if (authData.session) {
        await supabaseForSession.auth.setSession(authData.session);
      }

      // Return success response with user data
      return NextResponse.json({
        success: true,
        data: {
          user: {
            id: authData.user.id,
            email: authData.user.email,
            email_confirmed_at: authData.user.email_confirmed_at,
          },
          profile: profile,
          participant: participant,
          session: authData.session
            ? {
                access_token: authData.session.access_token,
                refresh_token: authData.session.refresh_token,
                expires_at: authData.session.expires_at,
                expires_in: authData.session.expires_in,
              }
            : null,
        },
        message: "Account created successfully",
      });
    } catch (error: any) {
      // If profile or participant creation fails, we should ideally delete the auth user
      // but that requires admin auth API calls which are complex
      console.error("Database transaction failed:", error.message);

      return NextResponse.json(
        {
          error: "Account creation failed",
          details: error.message,
          cleanup_note:
            "Auth user may have been created but profile/participant creation failed",
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Signup API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
