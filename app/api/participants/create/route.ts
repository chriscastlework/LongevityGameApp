import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient, createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// POST /api/participants/create - Create participant record for current user
export async function POST(request: NextRequest) {
  try {
    // Get auth user first
    const authSupabase = await createRouteHandlerClient();
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { participantCode } = body;

    if (!participantCode) {
      return NextResponse.json(
        { error: "Participant code is required" },
        { status: 400 }
      );
    }

    // Use admin client for database operations
    const supabase = createAdminClient();

    // Check if participant record already exists
    const { data: existingParticipant } = await supabase
      .from('participants')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (existingParticipant) {
      return NextResponse.json(existingParticipant);
    }

    // Create new participant record
    const { data: newParticipant, error: createError } = await supabase
      .from('participants')
      .insert({
        user_id: user.id,
        participant_code: participantCode
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating participant:', createError);
      return NextResponse.json(
        { error: "Failed to create participant record" },
        { status: 500 }
      );
    }

    return NextResponse.json(newParticipant);

  } catch (error) {
    console.error('Create participant API error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}