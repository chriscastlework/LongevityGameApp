import { useQuery } from "@tanstack/react-query";

// Current user's participant data
export interface CurrentParticipantData {
  id: string;
  participant_code: string;
  user_id: string;
  created_at: string;
}

// Query key for current user's participant data
export const currentParticipantQueryKey = (userId: string) => ["current-participant", userId] as const;

// Hook to fetch or create participant record for current user
export function useCurrentParticipant(userId?: string) {
  return useQuery({
    queryKey: currentParticipantQueryKey(userId || ""),
    queryFn: async (): Promise<CurrentParticipantData> => {
      try {
        console.log(`🔄 Fetching participant record for user: ${userId}`);
        const response = await fetch(`/api/participants/current`);

        if (!response.ok) {
          console.warn(
            `❌ Failed to fetch current participant (${response.status})`
          );
          throw new Error("Failed to fetch participant record");
        }

        const data = await response.json();
        console.log("✅ Current participant data received:", data);
        return data;
      } catch (error) {
        console.warn(
          "❌ Error fetching current participant:",
          error
        );
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    enabled: !!userId, // Only run if userId is provided
  });
}