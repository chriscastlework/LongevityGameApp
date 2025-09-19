"use client";

import { useState, useEffect, useCallback } from "react";

interface StationResult {
  id: string;
  participant_code: string;
  name: string;
  organisation: string | null;
  gender: string | null;
  balance: number | null;
  breath: number | null;
  grip: number | null;
  health: number | null;
  total_score: number;
  completed_stations: number;
  latest_completion: string;
  rank: number;
}

interface StationResultsResponse {
  results: StationResult[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  filters: {
    sort: string;
    order: string;
    name_filter: string;
    org_filter: string;
  };
}

interface UsePaginatedStationResultsParams {
  limit?: number;
  offset?: number;
  sort?: string;
  order?: "asc" | "desc";
  nameFilter?: string;
  orgFilter?: string;
}

export function usePaginatedStationResults(params: UsePaginatedStationResultsParams = {}) {
  const [data, setData] = useState<StationResultsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    limit = 10,
    offset = 0,
    sort = "total_score",
    order = "desc",
    nameFilter = "",
    orgFilter = "",
  } = params;

  const fetchResults = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const searchParams = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        sort,
        order,
        ...(nameFilter && { name_filter: nameFilter }),
        ...(orgFilter && { org_filter: orgFilter }),
      });

      const response = await fetch(`/api/station-results?${searchParams}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: StationResultsResponse = await response.json();
      setData(result);
    } catch (err) {
      console.error("Error fetching station results:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch results");
    } finally {
      setIsLoading(false);
    }
  }, [limit, offset, sort, order, nameFilter, orgFilter]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const refetch = useCallback(() => {
    fetchResults();
  }, [fetchResults]);

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}