import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/participants/by-user/[userId]/results - Get participant's station results
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
        score,
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

    // Use stored scores from database (don't recalculate)
    const resultsWithScores = (stationResults || []).map(result => {
      const station = stationMap.get(result.station_id);
      const maxScore = getMaxScoreForStation(result.station_type);
      return {
        id: result.id,
        stationType: result.station_type,
        stationName: station?.name || 'Unknown Station',
        stationDescription: station?.description || '',
        measurements: result.measurements,
        score: result.score || 0, // Use stored score from database, default to 0 if null
        maxScore: maxScore,
        completedAt: result.created_at
      };
    });

    // Calculate overall progress
    const allStations = ['balance', 'breath', 'grip', 'health'];
    const completedStations = resultsWithScores.map(r => r.stationType);
    const remainingStations = allStations.filter(station => !completedStations.includes(station));

    const totalScore = resultsWithScores.reduce((sum, result) => sum + (result.score || 0), 0);
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

// Helper function to get max score for each station type
function getMaxScoreForStation(stationType: string): number {
  // All stations currently use 1-3 scoring system
  return 3;
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
  // Calculate individual metric scores
  const scores = [
    calculateHealthMetricScore("bp_systolic", measurements.bp_systolic || 120),
    calculateHealthMetricScore("bp_diastolic", measurements.bp_diastolic || 80),
    calculateHealthMetricScore("pulse", measurements.pulse || 70),
    calculateHealthMetricScore("spo2", measurements.spo2 || 98),
    calculateHealthMetricScore("bmi", measurements.bmi || 22),
  ];

  const totalScore = scores.reduce((sum, score) => sum + score, 0);
  const averageScore = totalScore / scores.length;

  // Round to nearest integer, but ensure it's between 1 and 3
  return Math.max(1, Math.min(3, Math.round(averageScore)));
}

function calculateHealthMetricScore(metricName: string, value: number): number {
  switch (metricName) {
    case "bp_systolic":
      // Above Average: 100–129 mmHg, Average: 130–139 mmHg, Bad: ≥ 140 mmHg
      if (value >= 100 && value <= 129) return 3;
      if (value >= 130 && value <= 139) return 2;
      return 1;

    case "bp_diastolic":
      // Above Average: 60–79 mmHg, Average: 80–89 mmHg, Bad: ≥ 90 mmHg
      if (value >= 60 && value <= 79) return 3;
      if (value >= 80 && value <= 89) return 2;
      return 1;

    case "pulse":
      // Above Average: 50–70 bpm, Average: 71–85 bpm, Bad: > 85 bpm
      if (value >= 50 && value <= 70) return 3;
      if (value >= 71 && value <= 85) return 2;
      return 1;

    case "spo2":
      // Above Average: 97–100%, Average: 94–96%, Bad: ≤ 93%
      if (value >= 97 && value <= 100) return 3;
      if (value >= 94 && value <= 96) return 2;
      return 1;

    case "bmi":
      // Above Average: 18.5–24.9, Average: 25–29.9, Bad: ≥ 30 or < 18.5
      if (value >= 18.5 && value <= 24.9) return 3;
      if (value >= 25 && value <= 29.9) return 2;
      return 1;

    default:
      return 1;
  }
}


function calculateGrade(totalScore: number, completedStations: number): "Above Average" | "Average" | "Bad" {
  const maxPossibleScore = completedStations * 3;
  const percentage = (totalScore / maxPossibleScore) * 100;

  if (percentage >= 83) return "Above Average";
  if (percentage >= 50) return "Average";
  return "Bad";
}