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

// GET /api/station-results - Get station results with pagination, sorting, and filtering
export async function GET(request: NextRequest) {
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

    // Note: Leaderboard is accessible to all authenticated users
    // No role restriction needed for viewing results

    // Parse query parameters
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "10"), 50);
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const sortBy = url.searchParams.get("sort") || "total_score";
    const order = url.searchParams.get("order") === "asc" ? "asc" : "desc";
    const nameFilter = url.searchParams.get("name_filter") || "";
    const orgFilter = url.searchParams.get("org_filter") || "";

    // Validate sort field
    const validSortFields = ["rank", "balance", "breath", "grip", "health", "total_score", "name", "organisation"];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "total_score";

    // First get all participants with their station results
    const { data: participants, error: participantsError } = await supabase
      .from("participants")
      .select(`
        id,
        participant_code,
        user_id,
        created_at,
        station_results(
          station_type,
          score,
          created_at
        )
      `);

    if (participantsError) {
      console.error("Error fetching participants:", participantsError);
      return NextResponse.json(
        { error: "Failed to fetch station results" },
        { status: 500 }
      );
    }

    if (!participants) {
      return NextResponse.json({
        results: [],
        pagination: {
          total: 0,
          limit,
          offset,
          hasMore: false
        }
      });
    }

    // Get all user profiles for the participants
    const userIds = participants.map((p) => p.user_id);
    let profileQuery = supabase
      .from("profiles")
      .select("id, name, organisation, gender")
      .in("id", userIds);

    // Apply name filter if provided
    if (nameFilter) {
      profileQuery = profileQuery.ilike("name", `%${nameFilter}%`);
    }

    // Apply organisation filter if provided
    if (orgFilter) {
      profileQuery = profileQuery.ilike("organisation", `%${orgFilter}%`);
    }

    const { data: profiles, error: profilesError } = await profileQuery;

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return NextResponse.json(
        { error: "Failed to fetch profile data" },
        { status: 500 }
      );
    }

    // Create a map of profiles for quick lookup
    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    // Process participants to calculate scores and rankings
    const processedResults = participants
      .filter((participant) => {
        const profile = profileMap.get(participant.user_id);
        if (!profile) return false;

        // Apply filters at this stage
        if (nameFilter && !profile.name?.toLowerCase().includes(nameFilter.toLowerCase())) {
          return false;
        }
        if (orgFilter && !profile.organisation?.toLowerCase().includes(orgFilter.toLowerCase())) {
          return false;
        }

        return true;
      })
      .map((participant) => {
        const profile = profileMap.get(participant.user_id);

        // Extract scores from station results
        const balanceResult = participant.station_results.find(
          (r) => r.station_type === "balance"
        );
        const breathResult = participant.station_results.find(
          (r) => r.station_type === "breath"
        );
        const gripResult = participant.station_results.find(
          (r) => r.station_type === "grip"
        );
        const healthResult = participant.station_results.find(
          (r) => r.station_type === "health"
        );

        const scoreBalance = balanceResult?.score || null;
        const scoreBreath = breathResult?.score || null;
        const scoreGrip = gripResult?.score || null;
        const scoreHealth = healthResult?.score || null;

        // Calculate total score (only count completed stations)
        const scores = [
          scoreBalance,
          scoreBreath,
          scoreGrip,
          scoreHealth,
        ].filter((s) => s !== null) as number[];
        const totalScore =
          scores.length > 0
            ? scores.reduce((sum, score) => sum + score, 0)
            : 0;

        // Get the most recent completion date
        const completionDates = participant.station_results.map(
          (r) => new Date(r.created_at)
        );
        const latestDate =
          completionDates.length > 0
            ? new Date(
                Math.max(...completionDates.map((d) => d.getTime()))
              ).toISOString()
            : participant.created_at;

        return {
          id: participant.id,
          participant_code: participant.participant_code,
          name: profile?.name || "Unknown",
          organisation: profile?.organisation || null,
          gender: profile?.gender || null,
          balance: scoreBalance,
          breath: scoreBreath,
          grip: scoreGrip,
          health: scoreHealth,
          total_score: totalScore,
          completed_stations: scores.length,
          latest_completion: latestDate,
          rank: 0, // Will be set after sorting
        };
      })
      // Sort by total score first to calculate ranks
      .sort((a, b) => (b.total_score || 0) - (a.total_score || 0))
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));

    // Now apply the requested sorting
    let sortedResults = [...processedResults];

    if (sortField === "name") {
      sortedResults.sort((a, b) => {
        const aVal = a.name || "";
        const bVal = b.name || "";
        return order === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      });
    } else if (sortField === "organisation") {
      sortedResults.sort((a, b) => {
        const aVal = a.organisation || "";
        const bVal = b.organisation || "";
        return order === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      });
    } else {
      // Numeric sorting for scores and rank
      sortedResults.sort((a, b) => {
        const aVal = a[sortField as keyof typeof a] as number || 0;
        const bVal = b[sortField as keyof typeof b] as number || 0;
        return order === "asc" ? aVal - bVal : bVal - aVal;
      });
    }

    // Apply pagination
    const total = sortedResults.length;
    const paginatedResults = sortedResults.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return NextResponse.json({
      results: paginatedResults,
      pagination: {
        total,
        limit,
        offset,
        hasMore
      },
      filters: {
        sort: sortField,
        order,
        name_filter: nameFilter,
        org_filter: orgFilter
      }
    });
  } catch (error) {
    console.error("Station results GET API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
