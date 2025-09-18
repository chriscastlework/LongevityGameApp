import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import type { LeaderboardEntry } from "@/lib/types/database";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/leaderboard - Get leaderboard data with rankings and scores
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const url = new URL(request.url);
    const genderFilter = url.searchParams.get("gender"); // Optional gender filter

    // First, get all participants with their station results including scores
    const { data: participants, error: participantsError } =
      await supabase.from("participants").select(`
        id,
        participant_code,
        user_id,
        station_results(
          station_type,
          measurements,
          score,
          created_at
        )
      `);

    if (participantsError) {
      console.error("Error fetching participants:", participantsError);
      return NextResponse.json(
        { error: "Failed to fetch leaderboard data" },
        { status: 500 }
      );
    }

    if (!participants) {
      return NextResponse.json({ leaderboard: [], stats: getEmptyStats() });
    }

    // Get all user profiles for the participants
    const userIds = participants.map((p) => p.user_id);
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, name, organisation, gender")
      .in("id", userIds);

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
    const leaderboardEntries = participants
      .filter((participant) => {
        const profile = profileMap.get(participant.user_id);
        // Apply gender filter if provided
        if (genderFilter && genderFilter !== "all") {
          return profile?.gender === genderFilter;
        }
        return profile; // Only include participants that have profiles
      })
      .map((participant) => {
        const profile = profileMap.get(participant.user_id);
        // Extract scores from station results (use stored scores, not recalculated ones)
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

        // Use the scores that were properly calculated and stored in the database
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
            : null;

        // Determine grade
        const grade =
          totalScore !== null
            ? calculateGrade(totalScore, scores.length)
            : null;

        // Get the most recent completion date
        const completionDates = participant.station_results.map(
          (r) => new Date(r.created_at)
        );
        const latestDate =
          completionDates.length > 0
            ? new Date(
                Math.max(...completionDates.map((d) => d.getTime()))
              ).toISOString()
            : new Date().toISOString();

        return {
          id: participant.id,
          participant_code: participant.participant_code,
          full_name: profile?.name || "Unknown",
          organization: profile?.organisation || null,
          gender: profile?.gender,
          score_balance: scoreBalance,
          score_breath: scoreBreath,
          score_grip: scoreGrip,
          score_health: scoreHealth,
          total_score: totalScore,
          grade: grade,
          created_at: latestDate,
          rank: 0, // Will be set after sorting
        };
      })
      // Filter out participants with no completed stations
      .filter((entry) => entry.total_score !== null)
      // Sort by total score (descending) and assign ranks
      .sort((a, b) => (b.total_score || 0) - (a.total_score || 0))
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));

    // Calculate statistics
    const stats = calculateStats(leaderboardEntries);

    return NextResponse.json({
      leaderboard: leaderboardEntries,
      stats: stats,
    });
  } catch (error) {
    console.error("Leaderboard API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Note: Scores are now properly calculated and stored in station_results.score field
// using the calculateStationScore() function with demographic-based thresholds

function calculateGrade(
  totalScore: number,
  completedStations: number
): "Above Average" | "Average" | "Bad" {
  const maxPossibleScore = completedStations * 3;
  const percentage = (totalScore / maxPossibleScore) * 100;

  if (percentage >= 83) return "Above Average"; // ~10+ out of 12 or equivalent
  if (percentage >= 50) return "Average"; // ~6-9 out of 12 or equivalent
  return "Bad"; // Below 50%
}

function calculateStats(entries: LeaderboardEntry[]) {
  if (entries.length === 0) return getEmptyStats();

  const totalParticipants = entries.length;
  const avgScore =
    entries.reduce((sum, p) => sum + (p.total_score || 0), 0) /
    totalParticipants;
  const aboveAverage = entries.filter(
    (p) => p.grade === "Above Average"
  ).length;

  // Find top organization by average score
  const orgStats = entries.reduce((acc, p) => {
    if (!p.organization) return acc;
    if (!acc[p.organization]) {
      acc[p.organization] = { totalScore: 0, count: 0 };
    }
    acc[p.organization].totalScore += p.total_score || 0;
    acc[p.organization].count += 1;
    return acc;
  }, {} as Record<string, { totalScore: number; count: number }>);

  const topOrganization =
    Object.entries(orgStats)
      .map(([org, stats]) => ({
        org,
        avgScore: stats.totalScore / stats.count,
      }))
      .sort((a, b) => b.avgScore - a.avgScore)[0]?.org || "None";

  return {
    totalParticipants,
    avgScore: Math.round(avgScore * 10) / 10,
    aboveAverage,
    topOrganization,
  };
}

function getEmptyStats() {
  return {
    totalParticipants: 0,
    avgScore: 0,
    aboveAverage: 0,
    topOrganization: "None",
  };
}
