import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/participants/[participantCode] - Get participant data by code
export async function GET(
  request: NextRequest,
  { params }: { params: { participantCode: string } }
) {
  try {
    const { participantCode } = params;

    if (!participantCode) {
      return NextResponse.json(
        { error: "Participant code is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get participant first
    const { data: participant, error: participantError } = await supabase
      .from("participants")
      .select("*")
      .eq("participant_code", participantCode)
      .single();

    console.log("Participant lookup result:", {
      participant,
      participantError,
    });

    if (participantError || !participant) {
      console.error("Error fetching participant:", participantError);
      return NextResponse.json(
        { error: "Participant not found" },
        { status: 404 }
      );
    }

    // Get profile data separately
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("name, email, date_of_birth, gender, job_title, organisation")
      .eq("id", participant.user_id)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Combine the data
    const result = {
      ...participant,
      profiles: profile,
    };

    // Set cache headers for 5 minutes
    const response = NextResponse.json(result);
    response.headers.set("Cache-Control", "public, max-age=300, s-maxage=300");

    return response;
  } catch (error) {
    console.error("Participants API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
