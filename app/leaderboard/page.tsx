"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Medal, Award, RefreshCw, TrendingUp, Users, Activity } from "lucide-react";

import type { LeaderboardEntry, Grade } from "@/lib/types/database";

// Mock leaderboard data - in production this would come from Supabase
const mockLeaderboardData: LeaderboardEntry[] = [
  {
    id: "1",
    participant_code: "LFG-0001",
    full_name: "Sarah Johnson",
    organization: "Tech Corp",
    gender: "female",
    score_balance: 3,
    score_breath: 2,
    score_grip: 3,
    score_health: 3,
    total_score: 11,
    grade: "Above Average",
    created_at: "2025-01-15T10:30:00Z",
    rank: 1,
  },
  {
    id: "2",
    participant_code: "LFG-0002",
    full_name: "Mike Chen",
    organization: "Fitness Plus",
    gender: "male",
    score_balance: 2,
    score_breath: 3,
    score_grip: 3,
    score_health: 2,
    total_score: 10,
    grade: "Above Average",
    created_at: "2025-01-15T11:00:00Z",
    rank: 2,
  },
  {
    id: "3",
    participant_code: "LFG-0003",
    full_name: "Emily Davis",
    organization: "Health Solutions",
    gender: "female",
    score_balance: 2,
    score_breath: 2,
    score_grip: 2,
    score_health: 3,
    total_score: 9,
    grade: "Average",
    created_at: "2025-01-15T11:30:00Z",
    rank: 3,
  },
  {
    id: "4",
    participant_code: "LFG-0004",
    full_name: "David Wilson",
    organization: "Sports Academy",
    gender: "male",
    score_balance: 1,
    score_breath: 2,
    score_grip: 3,
    score_health: 2,
    total_score: 8,
    grade: "Average",
    created_at: "2025-01-15T12:00:00Z",
    rank: 4,
  },
  {
    id: "5",
    participant_code: "LFG-0005",
    full_name: "Lisa Rodriguez",
    organization: "Wellness Center",
    gender: "female",
    score_balance: 2,
    score_breath: 1,
    score_grip: 2,
    score_health: 2,
    total_score: 7,
    grade: "Average",
    created_at: "2025-01-15T12:30:00Z",
    rank: 5,
  },
];

const stats = {
  totalParticipants: mockLeaderboardData.length,
  avgScore: Math.round((mockLeaderboardData.reduce((sum, p) => sum + (p.total_score || 0), 0) / mockLeaderboardData.length) * 10) / 10,
  aboveAverage: mockLeaderboardData.filter(p => p.grade === "Above Average").length,
  topOrganization: "Tech Corp",
};

function getRankIcon(rank: number) {
  switch (rank) {
    case 1: return <Trophy className="h-5 w-5 text-yellow-500" />;
    case 2: return <Medal className="h-5 w-5 text-gray-400" />;
    case 3: return <Award className="h-5 w-5 text-amber-600" />;
    default: return <span className="w-5 text-center font-bold text-gray-500">#{rank}</span>;
  }
}

function getGradeBadgeVariant(grade: Grade | null): "default" | "secondary" | "destructive" {
  switch (grade) {
    case "Above Average": return "default";
    case "Average": return "secondary";
    case "Bad": return "destructive";
    default: return "secondary";
  }
}

function getScoreColor(score: number | null): string {
  if (score === null) return "text-gray-400";
  if (score >= 3) return "text-green-600";
  if (score >= 2) return "text-yellow-600";
  return "text-red-600";
}

export default function LeaderboardPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "male" | "female" | "other">("all");

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const filteredData = filter === "all"
    ? mockLeaderboardData
    : mockLeaderboardData.filter(p => p.gender === filter);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Longevity Fitness Games Leaderboard
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Live results and rankings
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Participants</p>
                  <p className="text-2xl font-bold">{stats.totalParticipants}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Average Score</p>
                  <p className="text-2xl font-bold">{stats.avgScore}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Above Average</p>
                  <p className="text-2xl font-bold">{stats.aboveAverage}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Top Organization</p>
                  <p className="text-lg font-bold">{stats.topOrganization}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Tabs value={filter} onValueChange={(value) => setFilter(value as typeof filter)} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">All Participants</TabsTrigger>
            <TabsTrigger value="male">Male</TabsTrigger>
            <TabsTrigger value="female">Female</TabsTrigger>
            <TabsTrigger value="other">Other</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Leaderboard Table */}
        <Card>
          <CardHeader>
            <CardTitle>Rankings</CardTitle>
            <CardDescription>
              Participants ranked by total score across all four fitness stations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Participant</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead className="text-center">Balance</TableHead>
                  <TableHead className="text-center">Breath</TableHead>
                  <TableHead className="text-center">Grip</TableHead>
                  <TableHead className="text-center">Health</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Grade</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((participant) => (
                  <TableRow key={participant.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {getRankIcon(participant.rank)}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div>
                        <p className="font-medium">{participant.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {participant.participant_code}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell className="text-sm">
                      {participant.organization || "-"}
                    </TableCell>

                    <TableCell className="text-center">
                      <span className={`font-medium ${getScoreColor(participant.score_balance)}`}>
                        {participant.score_balance || "-"}
                      </span>
                    </TableCell>

                    <TableCell className="text-center">
                      <span className={`font-medium ${getScoreColor(participant.score_breath)}`}>
                        {participant.score_breath || "-"}
                      </span>
                    </TableCell>

                    <TableCell className="text-center">
                      <span className={`font-medium ${getScoreColor(participant.score_grip)}`}>
                        {participant.score_grip || "-"}
                      </span>
                    </TableCell>

                    <TableCell className="text-center">
                      <span className={`font-medium ${getScoreColor(participant.score_health)}`}>
                        {participant.score_health || "-"}
                      </span>
                    </TableCell>

                    <TableCell className="text-center">
                      <span className="text-lg font-bold">
                        {participant.total_score || "-"}
                      </span>
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge variant={getGradeBadgeVariant(participant.grade)}>
                        {participant.grade || "-"}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(participant.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredData.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No participants found for the selected filter</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scoring Guide */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Scoring Guide</CardTitle>
            <CardDescription>
              Understanding the fitness assessment scores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3">Score Ranges</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Each Station:</span>
                    <span className="font-medium">1-3 points</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Score:</span>
                    <span className="font-medium">4-12 points</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Above Average:</span>
                    <span className="font-medium text-green-600">10-12 points</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average:</span>
                    <span className="font-medium text-yellow-600">6-9 points</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Needs Improvement:</span>
                    <span className="font-medium text-red-600">4-5 points</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Test Stations</h4>
                <div className="space-y-2 text-sm">
                  <div><strong>Balance:</strong> Stability and coordination</div>
                  <div><strong>Breath:</strong> Respiratory endurance</div>
                  <div><strong>Grip:</strong> Hand and forearm strength</div>
                  <div><strong>Health:</strong> Vital signs and body composition</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}