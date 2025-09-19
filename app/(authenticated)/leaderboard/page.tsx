"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AuthenticatedLayout } from "@/components/layout/authenticated-layout";
import {
  Trophy,
  Medal,
  Award,
  TrendingUp,
  Users,
  Activity,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowUpDown,
} from "lucide-react";
import { usePaginatedStationResults } from "@/lib/hooks/usePaginatedStationResults";
import { useStationsWithStorage } from "@/lib/hooks/useStationsWithStorage";
import { Alert, AlertDescription } from "@/components/ui/alert";

import type { Grade } from "@/lib/types/database";

function calculateGrade(
  totalScore: number,
  completedStations: number
): "Above Average" | "Average" | "Bad" {
  if (completedStations === 0) return "Bad";
  const maxPossibleScore = completedStations * 3;
  const percentage = (totalScore / maxPossibleScore) * 100;

  if (percentage >= 83) return "Above Average";
  if (percentage >= 50) return "Average";
  return "Bad";
}

function getRankIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Trophy className="h-5 w-5 text-yellow-500" />;
    case 2:
      return <Medal className="h-5 w-5 text-gray-400" />;
    case 3:
      return <Award className="h-5 w-5 text-amber-600" />;
    default:
      return (
        <span className="w-5 text-center font-bold text-gray-500">#{rank}</span>
      );
  }
}

function getGradeBadgeVariant(
  grade: Grade | null
): "default" | "secondary" | "destructive" {
  switch (grade) {
    case "Above Average":
      return "default";
    case "Average":
      return "secondary";
    case "Bad":
      return "destructive";
    default:
      return "secondary";
  }
}

function getScoreColor(score: number | null): string {
  if (score === null) return "text-gray-400";
  if (score >= 3) return "text-green-600";
  if (score >= 2) return "text-yellow-600";
  return "text-red-600";
}

export default function LeaderboardPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState("total_score");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [nameFilter, setNameFilter] = useState("");
  const [orgFilter, setOrgFilter] = useState("");
  const [searchName, setSearchName] = useState("");
  const [searchOrg, setSearchOrg] = useState("");
  const itemsPerPage = 10;

  const { data, isLoading, error, refetch } = usePaginatedStationResults({
    limit: itemsPerPage,
    offset: (currentPage - 1) * itemsPerPage,
    sort: sortBy,
    order: sortOrder,
    nameFilter,
    orgFilter,
  });
  const {
    data: stations,
    isLoading: stationsLoading,
    isCached,
  } = useStationsWithStorage();

  // Auto-refresh every minute
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [refetch]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setNameFilter(searchName);
      setOrgFilter(searchOrg);
      setCurrentPage(1); // Reset to first page when filtering
    }, 500);

    return () => clearTimeout(timer);
  }, [searchName, searchOrg]);

  // Reset page when sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy, sortOrder]);

  const results = data?.results || [];
  const pagination = data?.pagination || {
    total: 0,
    limit: itemsPerPage,
    offset: 0,
    hasMore: false,
  };

  const totalPages = Math.ceil(pagination.total / itemsPerPage);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  // Calculate stats from current page data
  const stats = {
    totalParticipants: pagination.total,
    avgScore:
      results.length > 0
        ? Math.round(
            (results.reduce((sum, r) => sum + r.total_score, 0) /
              results.length) *
              10
          ) / 10
        : 0,
    aboveAverage: results.filter((r) => r.total_score >= 10).length,
    topOrganization:
      results.length > 0
        ? results.reduce((acc, r) => {
            if (!r.organisation) return acc;
            const count = (acc[r.organisation] || 0) + 1;
            return { ...acc, [r.organisation]: count };
          }, {} as Record<string, number>)
        : {},
  };

  const topOrgName =
    Object.entries(stats.topOrganization).length > 0
      ? Object.entries(stats.topOrganization).sort(
          ([, a], [, b]) => b - a
        )[0]?.[0] || "None"
      : "None";

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const getSortIcon = (field: string) => {
    if (sortBy !== field) return <ArrowUpDown className="h-4 w-4 opacity-50" />;
    return sortOrder === "asc" ? "↑" : "↓";
  };

  return (
    <AuthenticatedLayout
      title="Leaderboard"
      subtitle="Live results and rankings"
      className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800"
    >
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Longevity Game Leaderboard
          </h1>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load leaderboard data: {error}
              <span className="text-sm block mt-2">
                The page will automatically retry in the next refresh cycle.
              </span>
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
                  <p className="text-sm text-muted-foreground">
                    Total Participants
                  </p>
                  <p className="text-2xl font-bold">
                    {stats.totalParticipants}
                  </p>
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
                  <p className="text-sm text-muted-foreground">
                    Top Organization
                  </p>
                  <p className="text-lg font-bold">{topOrgName}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Sort Controls */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Search & Filter</CardTitle>
            <CardDescription>
              Search by name or organization, and sort results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name..."
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex-1">
                <Input
                  placeholder="Search by organization..."
                  value={searchOrg}
                  onChange={(e) => setSearchOrg(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="total_score">Total Score</SelectItem>
                    <SelectItem value="rank">Rank</SelectItem>
                    <SelectItem value="balance">Balance</SelectItem>
                    <SelectItem value="breath">Breath</SelectItem>
                    <SelectItem value="grip">Grip</SelectItem>
                    <SelectItem value="health">Health</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="organisation">Organization</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                  }
                >
                  {sortOrder === "asc" ? "↑" : "↓"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard Table */}
        <Card>
          <CardHeader>
            <CardTitle>Rankings</CardTitle>
            <CardDescription>
              Participants ranked by total score across all four fitness
              stations
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
                    <TableHead className="w-16">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort("rank")}
                      >
                        Rank {getSortIcon("rank")}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort("name")}
                      >
                        Participant {getSortIcon("name")}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort("organisation")}
                      >
                        Organization {getSortIcon("organisation")}
                      </Button>
                    </TableHead>
                    <TableHead className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort("balance")}
                      >
                        Balance {getSortIcon("balance")}
                      </Button>
                    </TableHead>
                    <TableHead className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort("breath")}
                      >
                        Breath {getSortIcon("breath")}
                      </Button>
                    </TableHead>
                    <TableHead className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort("grip")}
                      >
                        Grip {getSortIcon("grip")}
                      </Button>
                    </TableHead>
                    <TableHead className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort("health")}
                      >
                        Health {getSortIcon("health")}
                      </Button>
                    </TableHead>
                    <TableHead className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort("total_score")}
                      >
                        Total {getSortIcon("total_score")}
                      </Button>
                    </TableHead>
                    <TableHead className="text-center">Grade</TableHead>
                    <TableHead>Completed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((participant) => {
                    const grade = calculateGrade(
                      participant.total_score,
                      participant.completed_stations
                    );
                    return (
                      <TableRow
                        key={participant.id}
                        className="hover:bg-muted/50"
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {getRankIcon(participant.rank)}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div>
                            <p className="font-medium">{participant.name}</p>
                          </div>
                        </TableCell>

                        <TableCell className="text-sm">
                          {participant.organisation || "-"}
                        </TableCell>

                        <TableCell className="text-center">
                          <span
                            className={`font-medium ${getScoreColor(
                              participant.balance
                            )}`}
                          >
                            {participant.balance || "-"}
                          </span>
                        </TableCell>

                        <TableCell className="text-center">
                          <span
                            className={`font-medium ${getScoreColor(
                              participant.breath
                            )}`}
                          >
                            {participant.breath || "-"}
                          </span>
                        </TableCell>

                        <TableCell className="text-center">
                          <span
                            className={`font-medium ${getScoreColor(
                              participant.grip
                            )}`}
                          >
                            {participant.grip || "-"}
                          </span>
                        </TableCell>

                        <TableCell className="text-center">
                          <span
                            className={`font-medium ${getScoreColor(
                              participant.health
                            )}`}
                          >
                            {participant.health || "-"}
                          </span>
                        </TableCell>

                        <TableCell className="text-center">
                          <span className="text-lg font-bold">
                            {participant.total_score || "-"}
                          </span>
                        </TableCell>

                        <TableCell className="text-center">
                          <Badge variant={getGradeBadgeVariant(grade)}>
                            {grade || "-"}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-sm text-muted-foreground">
                          <div>
                            <p>{participant.completed_stations}/4 stations</p>
                            <p className="text-xs">
                              {new Date(
                                participant.latest_completion
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            {!isLoading && results.length === 0 && !error && (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>
                  No participants found
                  {nameFilter || orgFilter ? " for the selected filters" : ""}
                </p>
                <p className="text-sm mt-2">
                  {nameFilter || orgFilter
                    ? "Try adjusting your search criteria"
                    : "Complete your fitness assessment to appear on the leaderboard!"}
                </p>
              </div>
            )}

            {/* Pagination Controls */}
            {!isLoading && results.length > 0 && (
              <div className="flex items-center justify-between px-6 py-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {pagination.offset + 1} to{" "}
                  {Math.min(
                    pagination.offset + pagination.limit,
                    pagination.total
                  )}{" "}
                  of {pagination.total} results
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={!hasPrevPage}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={!hasNextPage}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dynamic Scoring Guide */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Scoring Guide</CardTitle>
            <CardDescription>
              Understanding the fitness assessment scores
              {isCached && (
                <span className="text-xs text-muted-foreground ml-2">
                  (using cached data)
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stationsLoading && !isCached ? (
              <div className="text-center py-8">
                <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center mx-auto mb-2">
                  <div className="w-3 h-3 bg-muted-foreground rounded-full animate-pulse" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Loading scoring guide...
                </p>
              </div>
            ) : (
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
                      <span className="font-medium">
                        {stations?.length
                          ? `${stations.length}-${stations.length * 3}`
                          : "4-12"}{" "}
                        points
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Above Average:</span>
                      <span className="font-medium text-green-600">
                        {stations?.length
                          ? `${Math.ceil(stations.length * 3 * 0.83)}-${
                              stations.length * 3
                            }`
                          : "10-12"}{" "}
                        points
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average:</span>
                      <span className="font-medium text-yellow-600">
                        {stations?.length
                          ? `${Math.ceil(
                              stations.length * 3 * 0.5
                            )}-${Math.floor(stations.length * 3 * 0.82)}`
                          : "6-9"}{" "}
                        points
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Needs Improvement:</span>
                      <span className="font-medium text-red-600">
                        {stations?.length
                          ? `${stations.length}-${Math.floor(
                              stations.length * 3 * 0.49
                            )}`
                          : "4-5"}{" "}
                        points
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Test Stations</h4>
                  <div className="space-y-2 text-sm">
                    {stations && stations.length > 0 ? (
                      stations
                        .sort(
                          (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
                        )
                        .map((station) => (
                          <div key={station.id}>
                            <strong>{station.name}:</strong>{" "}
                            {station.description || "Fitness assessment"}
                          </div>
                        ))
                    ) : (
                      <div className="text-muted-foreground">
                        Loading station information...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
