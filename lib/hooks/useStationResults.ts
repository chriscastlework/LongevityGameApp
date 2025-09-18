import { useMutation, useQueryClient } from "@tanstack/react-query";
import { participantResultsQueryKey } from "./useParticipantResults";
import type { StationType, BalanceMeasurement, BreathMeasurement, GripMeasurement } from "@/lib/types/database";

type MeasurementData = BalanceMeasurement | BreathMeasurement | GripMeasurement;

interface StationResultRequest {
  participantCode: string;
  stationType: StationType;
  measurements: MeasurementData;
}

interface StationResultResponse {
  success: boolean;
  result_id: string;
  participant_id: string;
  participant_code: string;
  station_type: StationType;
  measurements: MeasurementData;
  created_at: string;
}

interface ConflictError extends Error {
  isConflict: boolean;
  existingResultId?: string;
  recordedAt?: string;
}

// Hook to submit station results and invalidate related caches
export function useSubmitStationResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: StationResultRequest): Promise<StationResultResponse> => {
      console.log("🔄 Submitting station result:", data);

      const response = await fetch('/api/station-results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();

        // Handle 409 Conflict for duplicate results
        if (response.status === 409) {
          const conflictError: ConflictError = new Error(error.error || 'Participant score is already recorded for this station') as ConflictError;
          conflictError.isConflict = true;
          conflictError.existingResultId = error.existingResultId;
          conflictError.recordedAt = error.recordedAt;
          throw conflictError;
        }

        throw new Error(error.error || 'Failed to save measurements');
      }

      const result = await response.json();
      console.log("✅ Station result submitted successfully:", result);
      return result;
    },
    onSuccess: (data) => {
      // Invalidate participant results for the user who just completed a station
      // Note: We don't have direct access to userId here, but we can invalidate all participant results
      // or we could pass userId as part of the mutation data
      queryClient.invalidateQueries({
        queryKey: ["participantResults"],
        exact: false // This will invalidate all queries that start with "participantResults"
      });

      // Also invalidate leaderboard data since scores have changed
      queryClient.invalidateQueries({
        queryKey: ["leaderboard"]
      });

      console.log("🔄 Cache invalidated for participant results and leaderboard");
    },
    onError: (error) => {
      console.error('❌ Failed to submit station result:', error);
    },
  });
}

// Hook to delete station results and invalidate related caches
export function useDeleteStationResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (resultId: string): Promise<{ success: boolean; message: string }> => {
      console.log("🔄 Deleting station result:", resultId);

      const response = await fetch(`/api/station-results?id=${resultId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete existing result');
      }

      const result = await response.json();
      console.log("✅ Station result deleted successfully:", result);
      return result;
    },
    onSuccess: () => {
      // Invalidate participant results and leaderboard after deletion
      queryClient.invalidateQueries({
        queryKey: ["participantResults"],
        exact: false
      });

      queryClient.invalidateQueries({
        queryKey: ["leaderboard"]
      });

      console.log("🔄 Cache invalidated after deletion");
    },
    onError: (error) => {
      console.error('❌ Failed to delete station result:', error);
    },
  });
}