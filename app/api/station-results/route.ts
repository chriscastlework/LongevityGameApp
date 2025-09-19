import { NextRequest, NextResponse } from "next/server";
import {
  createAdminClient,
  createRouteHandlerClient,
} from "@/lib/supabase/server";
import type { StationType, StationResultInsert } from "@/lib/types/database";
import {
  calculateStationScore,
  type MeasurementData,
} from "@/lib/scoring/calculator";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface StationResultRequest {
  participantCode: string;
  stationType: StationType;
  measurements: MeasurementData;
}

// POST /api/station-results - Save station measurements for a participant
export async function POST(request: NextRequest) {
  try {
    // First verify user authentication with regular client
    const userSupabase = await createRouteHandlerClient();
    const {
      data: { user },
      error: userError,
    } = await userSupabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Now use admin client for database operations
    const supabase = createAdminClient();

    // Check if user has operator or admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "operator" && profile.role !== "admin")) {
      return NextResponse.json(
        { error: "Insufficient permissions. Operator or admin role required." },
        { status: 403 }
      );
    }

    const body: StationResultRequest = await request.json();
    const { participantCode, stationType, measurements } = body;

    if (!participantCode || !stationType || !measurements) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: participantCode, stationType, measurements",
        },
        { status: 400 }
      );
    }

    // Find the participant by participant_code
    console.log("Looking for participant with code:", participantCode);

    const { data: participant, error: participantError } = await supabase
      .from("participants")
      .select("id, user_id")
      .eq("participant_code", participantCode)
      .single();

    console.log("Participant query result:", { participant, participantError });

    if (participantError || !participant) {
      console.error("Participant not found:", participantError);
      return NextResponse.json(
        { error: "Participant not found" },
        { status: 404 }
      );
    }

    // Find the station to get the station_id
    const { data: station, error: stationError } = await supabase
      .from("stations")
      .select("id")
      .eq("station_type", stationType)
      .single();

    if (stationError || !station) {
      console.error("Station not found:", stationError);
      return NextResponse.json({ error: "Station not found" }, { status: 404 });
    }

    // Check if participant already has a result for this station
    const { data: existingResult, error: existingError } = await supabase
      .from("station_results")
      .select("id, created_at")
      .eq("participant_id", participant.id)
      .eq("station_id", station.id)
      .single();

    if (existingResult) {
      return NextResponse.json(
        {
          error: "Participant score is already recorded for this station",
          existingResultId: existingResult.id,
          recordedAt: existingResult.created_at,
        },
        { status: 409 }
      );
    }

    // Calculate the score using application logic
    const calculatedScore = await calculateStationScore(
      participant.id,
      stationType,
      measurements
    );

    // Create a new station result record with calculated score
    const stationResultData: StationResultInsert = {
      participant_id: participant.id,
      station_id: station.id,
      station_type: stationType,
      measurements: measurements as any, // JSONB field - cast to bypass type checking
      score: calculatedScore,
      recorded_by: user.id,
    };

    const { data: stationResult, error: insertError } = await supabase
      .from("station_results")
      .insert(stationResultData)
      .select()
      .single();

    if (insertError) {
      console.error("Error saving station result:", insertError);
      return NextResponse.json(
        { error: "Failed to save measurements" },
        { status: 500 }
      );
    }

    // Create an audit record in station_audits table if it exists
    try {
      // Note: station_audits table may not exist in current database schema
      // This is optional functionality for audit trail
      console.log("Audit record would be created:", {
        participant_id: participant.id,
        station: stationType,
        payload: measurements,
        actor: user.email || user.id,
      });
    } catch (auditError) {
      // If audit table doesn't exist, that's ok - just continue
      console.warn("Could not create audit record:", auditError);
    }

    return NextResponse.json({
      success: true,
      result_id: stationResult.id,
      participant_id: participant.id,
      participant_code: participantCode,
      station_type: stationType,
      measurements: measurements,
      score: calculatedScore,
      created_at: stationResult.created_at,
    });
  } catch (error) {
    console.error("Station results API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/station-results - Delete a station result by ID
export async function DELETE(request: NextRequest) {
  try {
    // First verify user authentication with regular client
    const userSupabase = await createRouteHandlerClient();
    const {
      data: { user },
      error: userError,
    } = await userSupabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Now use admin client for database operations
    const supabase = createAdminClient();

    // Check if user has operator or admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "operator" && profile.role !== "admin")) {
      return NextResponse.json(
        { error: "Insufficient permissions. Operator or admin role required." },
        { status: 403 }
      );
    }

    // Get the result ID from query parameters
    const url = new URL(request.url);
    const resultId = url.searchParams.get("id");

    if (!resultId) {
      return NextResponse.json(
        { error: "Missing required parameter: id" },
        { status: 400 }
      );
    }

    // First, get the existing result to verify it exists and get participant info
    const { data: existingResult, error: fetchError } = await supabase
      .from("station_results")
      .select(
        `
        id,
        participant_id,
        station_id,
        station_type,
        measurements,
        created_at,
        participants!inner(participant_code),
        stations!inner(station_type)
      `
      )
      .eq("id", resultId)
      .single();

    if (fetchError || !existingResult) {
      return NextResponse.json(
        { error: "Station result not found" },
        { status: 404 }
      );
    }

    // Delete the station result
    const { error: deleteError } = await supabase
      .from("station_results")
      .delete()
      .eq("id", resultId);

    if (deleteError) {
      console.error("Error deleting station result:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete station result" },
        { status: 500 }
      );
    }

    // Log the deletion for audit purposes
    console.log("Station result deleted:", {
      result_id: resultId,
      participant_id: existingResult.participant_id,
      participant_code: existingResult.participants.participant_code,
      station_type: existingResult.station_type,
      deleted_by: user.email || user.id,
      deleted_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Station result deleted successfully",
      deletedResult: {
        id: resultId,
        participantCode: existingResult.participants.participant_code,
        stationType: existingResult.station_type,
        recordedAt: existingResult.created_at,
      },
    });
  } catch (error) {
    console.error("Station results DELETE API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
