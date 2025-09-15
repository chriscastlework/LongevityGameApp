import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Station, StationUpdate } from "@/lib/types/database";

// Query key for stations data
export const stationsQueryKey = ["stations"] as const;

// Hook to fetch all active stations
export function useStations() {
  return useQuery({
    queryKey: stationsQueryKey,
    queryFn: async (): Promise<Station[]> => {
      try {
        console.log("🔄 Fetching stations from API...");
        const response = await fetch("/api/stations");

        if (!response.ok) {
          console.warn(
            `❌ Failed to fetch stations from API (${response.status}), using fallback data`
          );
          return [];
        }

        const data = await response.json();
        console.log("✅ Stations data received:", data);
        return data;
      } catch (error) {
        console.warn(
          "❌ Error fetching stations from API, using fallback data:",
          error
        );
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime in v4)
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}

// Hook to update a station (admin only)
export function useUpdateStation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (stationUpdate: StationUpdate & { id: string }) => {
      const response = await fetch("/api/stations", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(stationUpdate),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update station");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate stations query to refetch updated data
      queryClient.invalidateQueries({ queryKey: stationsQueryKey });
    },
  });
}

// Hook to get a specific station by ID (UUID)
export function useStation(stationId: string) {
  const { data: stations, ...rest } = useStations();

  const station = stations?.find((s) => s.id === stationId);

  return {
    data: station,
    ...rest,
  };
}

// Hook to get a specific station by type (balance, breath, grip, health)
export function useStationByType(stationType: string) {
  const { data: stations, ...rest } = useStations();

  const station = stations?.find((s) => s.station_type === stationType);

  return {
    data: station,
    ...rest,
  };
}

// Prefetch stations data (useful for performance optimization)
export function usePrefetchStations() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.prefetchQuery({
      queryKey: stationsQueryKey,
      queryFn: async (): Promise<Station[]> => {
        const response = await fetch("/api/stations");

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to fetch stations");
        }

        return response.json();
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };
}
