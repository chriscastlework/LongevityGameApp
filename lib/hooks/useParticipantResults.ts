import { useState, useEffect } from 'react';

interface ParticipantResult {
  id: string;
  stationType: string;
  stationName: string;
  stationDescription: string;
  measurements: any;
  score: number;
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

interface UseParticipantResultsResult {
  data: ParticipantResultsData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useParticipantResults(userId: string | undefined): UseParticipantResultsResult {
  const [data, setData] = useState<ParticipantResultsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/participants/${userId}/results`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Participant not found is not really an error - just no results yet
          setData({
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
          });
          return;
        }
        throw new Error(`Failed to fetch results: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching participant results:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch results');
    } finally {
      setIsLoading(false);
    }
  };

  const refetch = async () => {
    await fetchResults();
  };

  useEffect(() => {
    fetchResults();
  }, [userId]);

  return {
    data,
    isLoading,
    error,
    refetch
  };
}