import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient, createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/participants/current - Get or create participant record for current user
export async function GET(request: NextRequest) {
  try {
    // Get auth user first
    const authSupabase = await createRouteHandlerClient();
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Use admin client for database operations
    const supabase = createAdminClient();

    // Check if participant record already exists
    const { data: existingParticipant, error: participantError } = await supabase
      .from('participants')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (participantError && participantError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is OK
      console.error('Error checking for existing participant:', participantError);
      return NextResponse.json(
        { error: "Failed to check participant record" },
        { status: 500 }
      );
    }

    // If participant exists, return it
    if (existingParticipant) {
      return NextResponse.json(existingParticipant);
    }

    // Generate participant code from user ID
    const participantCode = `LFG-${user.id.slice(-4).toUpperCase()}`;

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
    console.error('Current participant API error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}