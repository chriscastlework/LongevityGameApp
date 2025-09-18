import { createAdminClient } from "@/lib/supabase/server";
import type {
  StationType,
  BalanceMeasurement,
  BreathMeasurement,
  GripMeasurement,
} from "@/lib/types/database";

export type MeasurementData =
  | BalanceMeasurement
  | BreathMeasurement
  | GripMeasurement;

interface ScoringThreshold {
  average_score_min: number | null;
  average_score_max: number | null;
}

interface ParticipantDemographics {
  gender: string;
  age_group: string;
}

/**
 * Calculate age group from date of birth
 */
export function getAgeGroup(dateOfBirth: string): string {
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  // Adjust age if birthday hasn't occurred this year
  const actualAge =
    monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ? age - 1
      : age;

  if (actualAge >= 18 && actualAge <= 25) return "18-25";
  if (actualAge >= 26 && actualAge <= 35) return "26-35";
  if (actualAge >= 36 && actualAge <= 45) return "36-45";
  if (actualAge >= 46 && actualAge <= 55) return "46-55";
  if (actualAge >= 56 && actualAge <= 65) return "56-65";
  if (actualAge >= 66) return "65+";

  return "18-25"; // Default for edge cases
}

/**
 * Get participant demographics (gender and age group)
 */
export async function getParticipantDemographics(
  participantId: string
): Promise<ParticipantDemographics | null> {
  const supabase = createAdminClient();

  const { data: participant, error: participantError } = await supabase
    .from("participants")
    .select("user_id")
    .eq("id", participantId)
    .single();

  if (participantError || !participant) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("gender, date_of_birth")
    .eq("id", participant.user_id)
    .single();

  if (profileError || !profile) {
    return null;
  }

  const ageGroup = getAgeGroup(profile.date_of_birth);

  return {
    gender: profile.gender,
    age_group: ageGroup,
  };
}

/**
 * Get scoring thresholds for a specific metric and demographics
 */
export async function getScoringThresholds(
  stationType: StationType,
  metricName: string,
  gender: string,
  ageGroup: string
): Promise<ScoringThreshold | null> {
  const supabase = createAdminClient();

  const { data: threshold, error } = await supabase
    .from("scoring_thresholds")
    .select("average_score_min, average_score_max")
    .eq("station_type", stationType)
    .eq("metric_name", metricName)
    .eq("gender", gender)
    .eq("age_group", ageGroup)
    .eq("is_active", true)
    .single();

  if (error || !threshold) {
    return null;
  }

  return threshold;
}

/**
 * Calculate score for a single measurement using simplified thresholds
 */
export function calculateMeasurementScore(
  value: number,
  thresholds: ScoringThreshold
): number {
  // Handle null thresholds
  if (
    thresholds.average_score_min === null ||
    thresholds.average_score_max === null
  ) {
    return 1;
  }

  // Simplified scoring logic:
  // Score 3: value > average_score_max (excellent performance)
  // Score 2: average_score_min <= value < average_score_max (average performance)
  // Score 1: value < average_score_min (below average performance)

  if (value > thresholds.average_score_max) {
    return 3;
  } else if (value >= thresholds.average_score_min) {
    return 2;
  } else {
    return 1;
  }
}

/**
 * Extract measurement value from station measurements based on station type
 */
export function extractMeasurementValue(
  stationType: StationType,
  measurements: MeasurementData
): { value: number; metricName: string } | null {
  switch (stationType) {
    case "balance":
      const balanceMeasurement = measurements as BalanceMeasurement;
      return {
        value: balanceMeasurement.balance_seconds,
        metricName: "balance_seconds",
      };

    case "breath":
      const breathMeasurement = measurements as BreathMeasurement;
      return {
        value: breathMeasurement.balloon_diameter_cm,
        metricName: "balloon_diameter_cm",
      };

    case "grip":
      const gripMeasurement = measurements as GripMeasurement;
      return {
        value: gripMeasurement.grip_seconds,
        metricName: "grip_seconds",
      };


    default:
      return null;
  }
}

/**
 * Calculate station score for given measurements and participant
 */
export async function calculateStationScore(
  participantId: string,
  stationType: StationType,
  measurements: MeasurementData
): Promise<number> {
  try {
    // Get participant demographics
    const demographics = await getParticipantDemographics(participantId);
    if (!demographics) {
      console.warn(
        `Could not get demographics for participant ${participantId}, using default score`
      );
      return 1;
    }

    // Extract measurement value and metric name
    const measurementData = extractMeasurementValue(stationType, measurements);
    if (!measurementData) {
      console.warn(
        `Could not extract measurement for station type ${stationType}, using default score`
      );
      return 1;
    }

    // Get scoring thresholds
    const thresholds = await getScoringThresholds(
      stationType,
      measurementData.metricName,
      demographics.gender,
      demographics.age_group
    );

    if (!thresholds) {
      console.warn(
        `No scoring thresholds found for ${stationType}/${measurementData.metricName}/${demographics.gender}/${demographics.age_group}, using default score`
      );
      return 1;
    }

    // Calculate and return score
    const score = calculateMeasurementScore(measurementData.value, thresholds);

    console.log(
      `Calculated score for participant ${participantId}: ${stationType} = ${score} (${measurementData.value} ${measurementData.metricName})`
    );

    return score;
  } catch (error) {
    console.error("Error calculating station score:", error);
    return 1; // Default score on error
  }
}
