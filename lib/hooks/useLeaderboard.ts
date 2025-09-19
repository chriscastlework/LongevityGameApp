// import { useState, useEffect } from 'react';
// import type { LeaderboardEntry } from '@/lib/types/database';

// interface LeaderboardStats {
//   totalParticipants: number;
//   avgScore: number;
//   aboveAverage: number;
//   topOrganization: string;
// }

// interface LeaderboardData {
//   leaderboard: LeaderboardEntry[];
//   stats: LeaderboardStats;
// }

// interface UseLeaderboardResult {
//   data: LeaderboardData | null;
//   isLoading: boolean;
//   error: string | null;
//   refetch: (gender?: string) => Promise<void>;
// }

// export function useLeaderboard(gender: string = 'all'): UseLeaderboardResult {
//   const [data, setData] = useState<LeaderboardData | null>(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   const fetchLeaderboard = async (genderFilter: string = gender) => {
//     try {
//       setIsLoading(true);
//       setError(null);

//       const params = new URLSearchParams();
//       if (genderFilter && genderFilter !== 'all') {
//         params.append('gender', genderFilter);
//       }

//       const response = await fetch(`/api/leaderboard?${params.toString()}`, {
//         method: 'GET',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//       });

//       if (!response.ok) {
//         throw new Error(`Failed to fetch leaderboard: ${response.status}`);
//       }

//       const result = await response.json();
//       setData(result);
//     } catch (err) {
//       console.error('Error fetching leaderboard:', err);
//       setError(err instanceof Error ? err.message : 'Failed to fetch leaderboard');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const refetch = async (genderFilter?: string) => {
//     await fetchLeaderboard(genderFilter || gender);
//   };

//   useEffect(() => {
//     fetchLeaderboard(gender);
//   }, [gender]);

//   return {
//     data,
//     isLoading,
//     error,
//     refetch
//   };
// }
