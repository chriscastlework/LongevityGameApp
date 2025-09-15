import { useQuery } from "@tanstack/react-query";

// Participant data type from the API response
export interface ParticipantData {
  id: string;
  participant_code: string;
  user_id: string;
  created_at: string;
  profiles: {
    name: string;
    email: string;
    date_of_birth: string;
    gender: 'male' | 'female';
    job_title: string;
    organisation: string;
  };
}

// Query key for participant data
export const participantQueryKey = (participantCode: string) => ["participant", participantCode] as const;

// Hook to fetch participant data by participant code
export function useParticipant(participantCode: string) {
  return useQuery({
    queryKey: participantQueryKey(participantCode),
    queryFn: async (): Promise<ParticipantData> => {
      try {
        console.log(`🔄 Fetching participant data for: ${participantCode}`);
        const response = await fetch(`/api/participants/${participantCode}`);

        if (!response.ok) {
          console.warn(
            `❌ Failed to fetch participant data (${response.status})`
          );
          throw new Error("Failed to fetch participant data");
        }

        const data = await response.json();
        console.log("✅ Participant data received:", data);
        return data;
      } catch (error) {
        console.warn(
          "❌ Error fetching participant data:",
          error
        );
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    enabled: !!participantCode, // Only run if participantCode is provided
  });
}