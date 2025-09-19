import { useEffect } from "react";
import { useStations } from "./useStations";
import type { Station } from "@/lib/types/database";

const STORAGE_KEY = "fitness_stations_cache";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 1 day in milliseconds

interface CachedStations {
  data: Station[];
  timestamp: number;
}

export function useStationsWithStorage() {
  const { data: stationsData, isLoading, error, ...rest } = useStations();

  // Check if we have valid cached data
  const getCachedStations = (): Station[] | null => {
    if (typeof window === "undefined") return null;

    try {
      const cached = sessionStorage.getItem(STORAGE_KEY);
      if (!cached) return null;

      const parsedCache: CachedStations = JSON.parse(cached);
      const now = Date.now();

      // Check if cache is still valid (within 1 day)
      if (now - parsedCache.timestamp < CACHE_DURATION) {
        return parsedCache.data;
      } else {
        // Cache expired, remove it
        sessionStorage.removeItem(STORAGE_KEY);
        return null;
      }
    } catch (error) {
      console.warn("Failed to read stations cache:", error);
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
  };

  // Save data to session storage when we get fresh data
  useEffect(() => {
    if (stationsData && stationsData.length > 0) {
      try {
        const cacheData: CachedStations = {
          data: stationsData,
          timestamp: Date.now(),
        };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cacheData));
      } catch (error) {
        console.warn("Failed to cache stations data:", error);
      }
    }
  }, [stationsData]);

  // Return cached data if available and we're still loading
  const cachedStations = getCachedStations();
  const finalData = stationsData || cachedStations || [];

  return {
    data: finalData,
    isLoading: isLoading && !cachedStations,
    error,
    isCached: !stationsData && !!cachedStations,
    ...rest,
  };
}