import { useQuery } from "@tanstack/react-query";

interface ParticipantResult {
  id: string;
  stationType: string;
  stationName: string;
  stationDescription: string;
  measurements: any;
  score: number;
  maxScore: number;
  completedAt: string;
}

interface ParticipantProgress {
  completedStations: number;
  totalStations: number;
  remainingStations: string[];
  totalScore: number;
  maxPossibleScore: number;
  grade: string | null;
}

interface ParticipantResultsData {
  participantCode: string;
  results: ParticipantResult[];
  progress: ParticipantProgress;
}

// Query key for participant results data
export const participantResultsQueryKey = (userId: string) => ["participantResults", userId] as const;

export function useParticipantResults(userId: string | undefined) {
  return useQuery({
    queryKey: participantResultsQueryKey(userId || ''),
    queryFn: async (): Promise<ParticipantResultsData> => {
      if (!userId) {
        // Return default empty data if no userId
        return {
          participantCode: '',
          results: [],
          progress: {
            completedStations: 0,
            totalStations: 4,
            remainingStations: ['balance', 'breath', 'grip', 'health'],
            totalScore: 0,
            maxPossibleScore: 0,
            grade: null
          }
        };
      }

      try {
        console.log("🔄 Fetching participant results for user:", userId);
        const response = await fetch(`/api/participants/by-user/${userId}/results`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            // Participant not found is not really an error - just no results yet
            console.log("📭 No participant results found, returning default data");
            return {
              participantCode: '',
              results: [],
              progress: {
                completedStations: 0,
                totalStations: 4,
                remainingStations: ['balance', 'breath', 'grip', 'health'],
                totalScore: 0,
                maxPossibleScore: 0,
                grade: null
              }
            };
          }
          throw new Error(`Failed to fetch results: ${response.status}`);
        }

        const result = await response.json();
        console.log("✅ Participant results received:", result);
        return result;
      } catch (error) {
        console.error('❌ Error fetching participant results:', error);
        throw error;
      }
    },
    enabled: !!userId, // Only run query if userId exists
    staleTime: 30 * 1000, // 30 seconds - shorter than stations since results change more frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}