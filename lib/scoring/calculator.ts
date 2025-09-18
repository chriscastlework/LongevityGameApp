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
  min_average_value: number;
  max_average_value: number;
}

interface ParticipantDemographics {
  gender: string;
  age: number;
}

/**
 * Calculate age from date of birth
 */
export function getAge(dateOfBirth: string): number {
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  // Adjust age if birthday hasn't occurred this year
  const actualAge =
    monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ? age - 1
      : age;

  return Math.max(18, actualAge); // Minimum age of 18 for scoring
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

  const age = getAge(profile.date_of_birth);

  return {
    gender: profile.gender,
    age: age,
  };
}

/**
 * Get scoring thresholds for a specific station type and demographics
 */
export async function getScoringThresholds(
  stationType: StationType,
  gender: string,
  age: number
): Promise<ScoringThreshold | null> {
  const supabase = createAdminClient();

  const { data: thresholds, error } = await supabase
    .from("scoring_thresholds")
    .select("min_average_value, max_average_value, min_age, max_age")
    .eq("station_type", stationType)
    .eq("gender", gender)
    .lte("min_age", age)
    .or(`max_age.gte.${age},max_age.is.null`); // Handle open-ended age ranges

  if (error || !thresholds || thresholds.length === 0) {
    return null;
  }

  // Find the threshold that matches the age range
  const matchingThreshold = thresholds.find((threshold) => {
    const minAge = threshold.min_age;
    const maxAge = threshold.max_age;

    // Age must be >= min_age
    if (age < minAge) return false;

    // If max_age is null, it's an open range (60+)
    // Otherwise, age must be <= max_age
    if (maxAge !== null && age > maxAge) return false;

    return true;
  });

  if (!matchingThreshold) {
    return null;
  }

  return {
    min_average_value: matchingThreshold.min_average_value,
    max_average_value: matchingThreshold.max_average_value,
  };
}

/**
 * Calculate score for a measurement using the scoring thresholds
 * poor score = 1 (below min_average_value)
 * average score = 2 (between min_average_value and max_average_value)
 * excellent score = 3 (above max_average_value)
 */
export function calculateMeasurementScore(
  value: number,
  threshold: ScoringThreshold
): number {
  const { min_average_value, max_average_value } = threshold;

  // Excellent score: above max_average_value
  if (value > max_average_value) {
    return 3;
  }

  // Average score: between min_average_value and max_average_value (inclusive)
  if (value >= min_average_value && value <= max_average_value) {
    return 2;
  }

  // Poor score: below min_average_value
  return 1;
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
    const threshold = await getScoringThresholds(
      stationType,
      demographics.gender,
      demographics.age
    );

    if (!threshold) {
      console.warn(
        `No scoring thresholds found for ${stationType}/${demographics.gender}/${demographics.age}, using default score`
      );
      return 1;
    }

    // Calculate and return score
    const score = calculateMeasurementScore(measurementData.value, threshold);

    console.log(
      `Calculated score for participant ${participantId}: ${stationType} = ${score} (${measurementData.value} ${measurementData.metricName}, age: ${demographics.age}, gender: ${demographics.gender})`
    );

    return score;
  } catch (error) {
    console.error("Error calculating station score:", error);
    return 1; // Default score on error
  }
}
