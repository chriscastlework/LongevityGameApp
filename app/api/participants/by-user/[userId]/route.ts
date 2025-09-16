import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/participants/by-user/[userId] - Get participant by user ID
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get participant by user_id
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .select('participant_code')
      .eq('user_id', userId)
      .single();

    if (participantError || !participant) {
      console.error('Error fetching participant:', participantError);
      return NextResponse.json(
        { error: "Participant not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ participant_code: participant.participant_code });

  } catch (error) {
    console.error('Participants by-user API error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}