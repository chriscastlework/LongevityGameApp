import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/participants/[userId]/results - Get participant's station results
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = await createRouteHandlerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Only allow users to view their own results
    if (user.id !== params.userId) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Find the participant record for this user
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .select('id, participant_code')
      .eq('user_id', params.userId)
      .single();

    if (participantError || !participant) {
      return NextResponse.json(
        { error: "Participant not found" },
        { status: 404 }
      );
    }

    // Get all station results for this participant
    const { data: stationResults, error: resultsError } = await supabase
      .from('station_results')
      .select(`
        id,
        station_type,
        measurements,
        created_at,
        station_id
      `)
      .eq('participant_id', participant.id)
      .order('created_at', { ascending: false });

    if (resultsError) {
      console.error('Error fetching station results:', resultsError);
      return NextResponse.json(
        { error: "Failed to fetch results" },
        { status: 500 }
      );
    }

    // Get station information separately
    const { data: stations, error: stationsError } = await supabase
      .from('stations')
      .select('id, name, description');

    if (stationsError) {
      console.error('Error fetching stations:', stationsError);
      return NextResponse.json(
        { error: "Failed to fetch station information" },
        { status: 500 }
      );
    }

    // Create a map of stations for quick lookup
    const stationMap = new Map(stations?.map(s => [s.id, s]) || []);

    // Calculate scores for each result
    const resultsWithScores = (stationResults || []).map(result => {
      const score = calculateStationScore(result.station_type, result.measurements);
      const station = stationMap.get(result.station_id);
      return {
        id: result.id,
        stationType: result.station_type,
        stationName: station?.name || 'Unknown Station',
        stationDescription: station?.description || '',
        measurements: result.measurements,
        score: score,
        completedAt: result.created_at
      };
    });

    // Calculate overall progress
    const allStations = ['balance', 'breath', 'grip', 'health'];
    const completedStations = resultsWithScores.map(r => r.stationType);
    const remainingStations = allStations.filter(station => !completedStations.includes(station));

    const totalScore = resultsWithScores.reduce((sum, result) => sum + result.score, 0);
    const maxPossibleScore = completedStations.length * 3;
    const grade = maxPossibleScore > 0 ? calculateGrade(totalScore, completedStations.length) : null;

    return NextResponse.json({
      participantCode: participant.participant_code,
      results: resultsWithScores,
      progress: {
        completedStations: completedStations.length,
        totalStations: allStations.length,
        remainingStations,
        totalScore,
        maxPossibleScore,
        grade
      }
    });

  } catch (error) {
    console.error('Participant results API error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper functions to calculate scores (same as in leaderboard)
function calculateStationScore(stationType: string, measurements: any): number {
  switch (stationType) {
    case 'balance':
      return calculateBalanceScore(measurements);
    case 'breath':
      return calculateBreathScore(measurements);
    case 'grip':
      return calculateGripScore(measurements);
    case 'health':
      return calculateHealthScore(measurements);
    default:
      return 0;
  }
}

function calculateBalanceScore(measurements: any): number {
  const balanceSeconds = measurements?.balance_seconds || 0;
  if (balanceSeconds >= 45) return 3;
  if (balanceSeconds >= 25) return 2;
  return 1;
}

function calculateBreathScore(measurements: any): number {
  const breathSeconds = measurements?.breath_seconds || 0;
  if (breathSeconds >= 60) return 3;
  if (breathSeconds >= 30) return 2;
  return 1;
}

function calculateGripScore(measurements: any): number {
  const leftGrip = measurements?.grip_left_kg || 0;
  const rightGrip = measurements?.grip_right_kg || 0;
  const avgGrip = (leftGrip + rightGrip) / 2;
  if (avgGrip >= 40) return 3;
  if (avgGrip >= 25) return 2;
  return 1;
}

function calculateHealthScore(measurements: any): number {
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

  if (percentage >= 83) return "Above Average";
  if (percentage >= 50) return "Average";
  return "Bad";
}