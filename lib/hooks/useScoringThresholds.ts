import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ScoringThreshold, ScoringThresholdInsert, ScoringThresholdUpdate } from "@/lib/types/database";

// Query key for scoring thresholds data
export const scoringThresholdsQueryKey = (filters?: {
  station_type?: string;
  gender?: string;
  age?: number;
}) => ["scoringThresholds", filters] as const;

interface ScoringThresholdFilters {
  station_type?: string;
  gender?: string;
  age?: number;
}

// Hook to fetch scoring thresholds (admin only)
export function useScoringThresholds(filters?: ScoringThresholdFilters) {
  return useQuery({
    queryKey: scoringThresholdsQueryKey(filters),
    queryFn: async (): Promise<ScoringThreshold[]> => {
      const params = new URLSearchParams();
      if (filters?.station_type) params.set('station_type', filters.station_type);
      if (filters?.gender) params.set('gender', filters.gender);
      if (filters?.age !== undefined) params.set('age', filters.age.toString());

      const url = `/api/admin/scoring-thresholds${params.toString() ? `?${params.toString()}` : ''}`;

      console.log("🔄 Fetching scoring thresholds:", url);
      const response = await fetch(url);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch scoring thresholds');
      }

      const data = await response.json();
      console.log("✅ Scoring thresholds received:", data);
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
  });
}

// Hook to create scoring threshold (admin only)
export function useCreateScoringThreshold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ScoringThresholdInsert): Promise<ScoringThreshold> => {
      console.log("🔄 Creating scoring threshold:", data);

      const response = await fetch('/api/admin/scoring-thresholds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create scoring threshold');
      }

      const result = await response.json();
      console.log("✅ Scoring threshold created:", result);
      return result;
    },
    onSuccess: () => {
      // Invalidate and refetch scoring thresholds
      queryClient.invalidateQueries({
        queryKey: ["scoringThresholds"],
        exact: false
      });

      // Also invalidate participant results since scoring may have changed
      queryClient.invalidateQueries({
        queryKey: ["participantResults"],
        exact: false
      });

      console.log("🔄 Cache invalidated after threshold creation");
    },
    onError: (error) => {
      console.error('❌ Failed to create scoring threshold:', error);
    },
  });
}

// Hook to update scoring threshold (admin only)
export function useUpdateScoringThreshold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ScoringThresholdUpdate & { id: string }): Promise<ScoringThreshold> => {
      console.log("🔄 Updating scoring threshold:", data);

      const response = await fetch('/api/admin/scoring-thresholds', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update scoring threshold');
      }

      const result = await response.json();
      console.log("✅ Scoring threshold updated:", result);
      return result;
    },
    onSuccess: () => {
      // Invalidate and refetch scoring thresholds
      queryClient.invalidateQueries({
        queryKey: ["scoringThresholds"],
        exact: false
      });

      // Also invalidate participant results since scoring may have changed
      queryClient.invalidateQueries({
        queryKey: ["participantResults"],
        exact: false
      });

      // Invalidate leaderboard since scores may have changed
      queryClient.invalidateQueries({
        queryKey: ["leaderboard"]
      });

      console.log("🔄 Cache invalidated after threshold update");
    },
    onError: (error) => {
      console.error('❌ Failed to update scoring threshold:', error);
    },
  });
}

// Hook to delete scoring threshold (admin only)
export function useDeleteScoringThreshold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<{ success: boolean; message: string }> => {
      console.log("🔄 Deleting scoring threshold:", id);

      const response = await fetch(`/api/admin/scoring-thresholds?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete scoring threshold');
      }

      const result = await response.json();
      console.log("✅ Scoring threshold deleted:", result);
      return result;
    },
    onSuccess: () => {
      // Invalidate and refetch scoring thresholds
      queryClient.invalidateQueries({
        queryKey: ["scoringThresholds"],
        exact: false
      });

      // Also invalidate participant results since scoring may have changed
      queryClient.invalidateQueries({
        queryKey: ["participantResults"],
        exact: false
      });

      // Invalidate leaderboard since scores may have changed
      queryClient.invalidateQueries({
        queryKey: ["leaderboard"]
      });

      console.log("🔄 Cache invalidated after threshold deletion");
    },
    onError: (error) => {
      console.error('❌ Failed to delete scoring threshold:', error);
    },
  });
}