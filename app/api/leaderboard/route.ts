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
    const genderFilter = url.searchParams.get('gender'); // Optional gender filter

    // First, get all participants with their station results
    const { data: participants, error: participantsError } = await supabase
      .from('participants')
      .select(`
        id,
        participant_code,
        user_id,
        station_results(
          station_type,
          measurements,
          created_at
        )
      `);

    if (participantsError) {
      console.error('Error fetching participants:', participantsError);
      return NextResponse.json(
        { error: "Failed to fetch leaderboard data" },
        { status: 500 }
      );
    }

    if (!participants) {
      return NextResponse.json({ leaderboard: [], stats: getEmptyStats() });
    }

    // Get all user profiles for the participants
    const userIds = participants.map(p => p.user_id);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, organisation, gender')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return NextResponse.json(
        { error: "Failed to fetch profile data" },
        { status: 500 }
      );
    }

    // Create a map of profiles for quick lookup
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // Process participants to calculate scores and rankings
    const leaderboardEntries = participants
      .filter(participant => {
        const profile = profileMap.get(participant.user_id);
        // Apply gender filter if provided
        if (genderFilter && genderFilter !== 'all') {
          return profile?.gender === genderFilter;
        }
        return profile; // Only include participants that have profiles
      })
      .map((participant, index) => {
        const profile = profileMap.get(participant.user_id);
        // Extract scores from station results
        const balanceResult = participant.station_results.find(r => r.station_type === 'balance');
        const breathResult = participant.station_results.find(r => r.station_type === 'breath');
        const gripResult = participant.station_results.find(r => r.station_type === 'grip');
        const healthResult = participant.station_results.find(r => r.station_type === 'health');

        // Calculate scores based on measurements (you may need to adjust this logic)
        const scoreBalance = balanceResult ? calculateBalanceScore(balanceResult.measurements) : null;
        const scoreBreath = breathResult ? calculateBreathScore(breathResult.measurements) : null;
        const scoreGrip = gripResult ? calculateGripScore(gripResult.measurements) : null;
        const scoreHealth = healthResult ? calculateHealthScore(healthResult.measurements) : null;

        // Calculate total score (only count completed stations)
        const scores = [scoreBalance, scoreBreath, scoreGrip, scoreHealth].filter(s => s !== null) as number[];
        const totalScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) : null;

        // Determine grade
        const grade = totalScore !== null ? calculateGrade(totalScore, scores.length) : null;

        // Get the most recent completion date
        const completionDates = participant.station_results.map(r => new Date(r.created_at));
        const latestDate = completionDates.length > 0
          ? new Date(Math.max(...completionDates.map(d => d.getTime()))).toISOString()
          : new Date().toISOString();

        return {
          id: participant.id,
          participant_code: participant.participant_code,
          full_name: profile?.name || 'Unknown',
          organization: profile?.organisation || null,
          gender: profile?.gender || 'other',
          score_balance: scoreBalance,
          score_breath: scoreBreath,
          score_grip: scoreGrip,
          score_health: scoreHealth,
          total_score: totalScore,
          grade: grade,
          created_at: latestDate,
          rank: 0 // Will be set after sorting
        };
      })
      // Filter out participants with no completed stations
      .filter(entry => entry.total_score !== null)
      // Sort by total score (descending) and assign ranks
      .sort((a, b) => (b.total_score || 0) - (a.total_score || 0))
      .map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));

    // Calculate statistics
    const stats = calculateStats(leaderboardEntries);

    return NextResponse.json({
      leaderboard: leaderboardEntries,
      stats: stats
    });

  } catch (error) {
    console.error('Leaderboard API error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper functions to calculate scores from measurements
function calculateBalanceScore(measurements: any): number {
  const balanceSeconds = measurements?.balance_seconds || 0;
  // Score 1-3 based on balance time (adjust thresholds as needed)
  if (balanceSeconds >= 45) return 3;
  if (balanceSeconds >= 25) return 2;
  return 1;
}

function calculateBreathScore(measurements: any): number {
  const breathSeconds = measurements?.breath_seconds || 0;
  // Score 1-3 based on breath hold time (adjust thresholds as needed)
  if (breathSeconds >= 60) return 3;
  if (breathSeconds >= 30) return 2;
  return 1;
}

function calculateGripScore(measurements: any): number {
  const leftGrip = measurements?.grip_left_kg || 0;
  const rightGrip = measurements?.grip_right_kg || 0;
  const avgGrip = (leftGrip + rightGrip) / 2;
  // Score 1-3 based on average grip strength (adjust thresholds as needed)
  if (avgGrip >= 40) return 3;
  if (avgGrip >= 25) return 2;
  return 1;
}

function calculateHealthScore(measurements: any): number {
  // Complex health score based on multiple factors
  // This is a simplified version - you may want to implement more sophisticated scoring
  const bmi = measurements?.bmi || 22;
  const spo2 = measurements?.spo2 || 98;
  const pulse = measurements?.pulse || 72;

  let score = 0;

  // BMI scoring (healthy range gets higher score)
  if (bmi >= 18.5 && bmi <= 24.9) score += 1;
  else if (bmi >= 25 && bmi <= 29.9) score += 0.5;

  // SpO2 scoring
  if (spo2 >= 98) score += 1;
  else if (spo2 >= 95) score += 0.5;

  // Resting heart rate scoring
  if (pulse >= 60 && pulse <= 80) score += 1;
  else if (pulse >= 50 && pulse <= 90) score += 0.5;

  // Convert to 1-3 scale
  return Math.max(1, Math.min(3, Math.round(score)));
}

function calculateGrade(totalScore: number, completedStations: number): "Above Average" | "Average" | "Bad" {
  const maxPossibleScore = completedStations * 3;
  const percentage = (totalScore / maxPossibleScore) * 100;

  if (percentage >= 83) return "Above Average";  // ~10+ out of 12 or equivalent
  if (percentage >= 50) return "Average";       // ~6-9 out of 12 or equivalent
  return "Bad";                                 // Below 50%
}

function calculateStats(entries: LeaderboardEntry[]) {
  if (entries.length === 0) return getEmptyStats();

  const totalParticipants = entries.length;
  const avgScore = entries.reduce((sum, p) => sum + (p.total_score || 0), 0) / totalParticipants;
  const aboveAverage = entries.filter(p => p.grade === "Above Average").length;

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

  const topOrganization = Object.entries(orgStats)
    .map(([org, stats]) => ({ org, avgScore: stats.totalScore / stats.count }))
    .sort((a, b) => b.avgScore - a.avgScore)[0]?.org || "None";

  return {
    totalParticipants,
    avgScore: Math.round(avgScore * 10) / 10,
    aboveAverage,
    topOrganization
  };
}

function getEmptyStats() {
  return {
    totalParticipants: 0,
    avgScore: 0,
    aboveAverage: 0,
    topOrganization: "None"
  };
}