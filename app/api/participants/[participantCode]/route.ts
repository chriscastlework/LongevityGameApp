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

    // Get participant with their profile data
    const { data: participant, error } = await supabase
      .from('participants')
      .select(`
        id,
        participant_code,
        user_id,
        created_at,
        profiles!inner(
          name,
          email,
          date_of_birth,
          gender,
          job_title,
          organisation
        )
      `)
      .eq('participant_code', participantCode)
      .single();

    if (error) {
      console.error('Error fetching participant:', error);
      return NextResponse.json(
        { error: "Participant not found" },
        { status: 404 }
      );
    }

    if (!participant) {
      return NextResponse.json(
        { error: "Participant not found" },
        { status: 404 }
      );
    }

    // Set cache headers for 5 minutes
    const response = NextResponse.json(participant);
    response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300');

    return response;

  } catch (error) {
    console.error('Participants API error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}