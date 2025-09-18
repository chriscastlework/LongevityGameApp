"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AuthenticatedLayout } from "@/components/layout/authenticated-layout";
import { Trophy, Medal, Award, RefreshCw, TrendingUp, Users, Activity, AlertCircle } from "lucide-react";
import { useLeaderboard } from "@/lib/hooks/useLeaderboard";
import { Alert, AlertDescription } from "@/components/ui/alert";

import type { LeaderboardEntry, Grade } from "@/lib/types/database";

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
  const [filter, setFilter] = useState<"all" | "male" | "female" | "other">("all");
  const { data, isLoading, error, refetch } = useLeaderboard(filter);

  const handleRefresh = async () => {
    await refetch(filter);
  };

  const leaderboardData = data?.leaderboard || [];
  const stats = data?.stats || {
    totalParticipants: 0,
    avgScore: 0,
    aboveAverage: 0,
    topOrganization: "None"
  };

  return (
    <AuthenticatedLayout
      title="Leaderboard"
      subtitle="Live results and rankings"
      className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800"
    >
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Fitness Games Leaderboard
            </h1>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300">
              Live results and rankings
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            className="gap-2 self-start sm:self-auto"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load leaderboard data: {error}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="ml-4"
              >
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        )}

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
              Participants ranked by total score across all three fitness stations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="w-4 h-4 bg-primary-foreground rounded-full animate-pulse" />
                </div>
                <p className="text-muted-foreground">Loading leaderboard...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Participant</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead className="text-center">Balance</TableHead>
                    <TableHead className="text-center">Breath</TableHead>
                    <TableHead className="text-center">Grip</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Grade</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboardData.map((participant) => (
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
            )}

            {!isLoading && leaderboardData.length === 0 && !error && (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No participants found{filter !== 'all' ? ' for the selected filter' : ''}</p>
                <p className="text-sm mt-2">Complete your fitness assessment to appear on the leaderboard!</p>
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
                    <span className="font-medium">3-9 points</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Above Average:</span>
                    <span className="font-medium text-green-600">8-9 points</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average:</span>
                    <span className="font-medium text-yellow-600">5-7 points</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Needs Improvement:</span>
                    <span className="font-medium text-red-600">3-4 points</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Test Stations</h4>
                <div className="space-y-2 text-sm">
                  <div><strong>Balance:</strong> Stability and coordination</div>
                  <div><strong>Breath:</strong> Respiratory endurance</div>
                  <div><strong>Grip:</strong> Hand and forearm strength</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}