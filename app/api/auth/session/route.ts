import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient, createAdminClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: "Unauthorized", details: "Bearer token required" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Create client
    const supabase = await createRouteHandlerClient();

    // Get user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: "Invalid session", details: userError?.message || "User not found" },
        { status: 401 }
      );
    }

    console.log("Session validated for user:", user.id);

    // Get user profile and participant data using regular client
    try {
      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Profile fetch error:", profileError);
      }

      // Fetch participant record
      const { data: participant, error: participantError } = await supabase
        .from("participants")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (participantError) {
        console.error("Participant fetch error:", participantError);
      }

      // Return session data
      return NextResponse.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            email_confirmed_at: user.email_confirmed_at,
            last_sign_in_at: user.last_sign_in_at,
          },
          profile: profile || null,
          participant: participant || null,
        },
        message: "Session valid",
      });

    } catch (error: any) {
      console.error("Profile/participant fetch failed:", error.message);

      // Still return successful session even if profile fetch fails
      return NextResponse.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            email_confirmed_at: user.email_confirmed_at,
            last_sign_in_at: user.last_sign_in_at,
          },
          profile: null,
          participant: null,
        },
        message: "Session valid (profile data unavailable)",
      });
    }

  } catch (error: any) {
    console.error("Session API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}