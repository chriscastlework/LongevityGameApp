"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthenticatedLayout } from "@/components/layout/authenticated-layout";
import { Users, CheckCircle, AlertTriangle, Trash2 } from "lucide-react";
import { StationEntryForm } from "@/components/station/station-entry-form";
import { useAuthContext } from "@/components/providers/auth-provider";
import { isOperator } from "@/lib/auth/useApiAuth";
import { useStations } from "@/lib/hooks/useStations";
import { useParticipant } from "@/lib/hooks/useParticipant";
import {
  useSubmitStationResult,
  useDeleteStationResult,
} from "@/lib/hooks/useStationResults";
import { getIconByName } from "@/lib/utils/icons";
import type { StationType } from "@/lib/types/database";

export default function StationParticipantPage() {
  const params = useParams();
  const router = useRouter();
  const participantCode = params.participantCode as string;
  const { isAuthenticated, isLoading, user, profile } = useAuthContext();
  const {
    data: stations,
    isLoading: stationsLoading,
    error: stationsError,
  } = useStations();
  const {
    data: participant,
    isLoading: participantLoading,
    error: participantError,
  } = useParticipant(participantCode);
  const submitStationResult = useSubmitStationResult();
  const deleteStationResult = useDeleteStationResult();
  const [selectedStation, setSelectedStation] = useState<StationType | null>(
    null
  );
  const [submitted, setSubmitted] = useState(false);
  const [existingResult, setExistingResult] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const currentStation =
    selectedStation && stations
      ? stations.find((s) => s.station_type === selectedStation)
      : null;

  // Redirect to login if not authenticated, preserving the current URL
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const currentPath = `/stations/${participantCode}`;
      const loginUrl = `/auth/login?redirect=${encodeURIComponent(
        currentPath
      )}`;
      router.push(loginUrl);
    }
  }, [isAuthenticated, isLoading, participantCode, router]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center mb-2">
            <div className="w-4 h-4 bg-primary-foreground rounded-full" />
          </div>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (redirect will happen)
  if (!isAuthenticated) {
    return null;
  }

  // Check if user has operator role
  const hasOperatorRole = profile?.role ? isOperator(profile.role) : false;

  // Show unauthorized message if user doesn't have operator role
  if (!hasOperatorRole) {
    return (
      <AuthenticatedLayout
        title="Access Denied"
        subtitle="Operator access required"
        className="min-h-screen bg-gray-50 dark:bg-gray-900"
      >
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="text-center py-8">
              <Users className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-red-700 dark:text-red-400 mb-2">
                Access Denied
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                This page is only accessible to users with operator or admin
                roles.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Your current role: {profile?.role || "Unknown"}
              </p>
              <Button
                onClick={() => router.push("/participate")}
                className="mt-4"
              >
                Go to Participate Page
              </Button>
            </CardContent>
          </Card>
        </div>
      </AuthenticatedLayout>
    );
  }

  const handleStationSelect = (stationId: StationType) => {
    setSelectedStation(stationId);
    setExistingResult(null); // Clear any existing result when selecting new station
  };

  const handleDataSubmit = async (measurements: any) => {
    if (!selectedStation) return;

    try {
      await submitStationResult.mutateAsync({
        participantCode,
        stationType: selectedStation,
        measurements,
      });

      // Success! Show confirmation and reset
      setSubmitted(true);

      // Reset after a delay
      setTimeout(() => {
        setSubmitted(false);
        setSelectedStation(null);
      }, 3000);
    } catch (error: any) {
      // Handle duplicate result (409 Conflict)
      if (error.isConflict) {
        setExistingResult({
          error: error.message,
          existingResultId: error.existingResultId || "unknown",
          recordedAt: error.recordedAt || new Date().toISOString(),
          stationType: selectedStation,
          participantCode,
        });
        return;
      }

      console.error("Error saving measurements:", error);
      alert(
        `Failed to save measurements: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const handleDeleteExistingResult = async () => {
    if (!existingResult?.existingResultId) return;

    try {
      await deleteStationResult.mutateAsync(existingResult.existingResultId);

      // Clear existing result and hide confirmation dialog
      setExistingResult(null);
      setShowDeleteConfirm(false);

      // Show success message
      alert(
        "Existing result has been deleted. You can now enter new measurements."
      );
    } catch (error) {
      console.error("Error deleting existing result:", error);
      alert(
        `Failed to delete existing result: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  return (
    <AuthenticatedLayout
      title="Station Entry"
      subtitle="Enter participant scores"
      className="min-h-screen bg-gray-50 dark:bg-gray-900"
    >
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Users className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Station Entry
            </h1>
          </div>
          <div className="space-y-2">
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Participant:{" "}
              <Badge variant="secondary" className="text-lg px-3 py-1 ml-2">
                {participantCode}
              </Badge>
            </p>
            {participantLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-primary-foreground rounded-full" />
                </div>
                Loading participant info...
              </div>
            ) : participantError ? (
              <p className="text-sm text-red-500">
                Could not load participant information
              </p>
            ) : participant ? (
              <p className="text-xl font-semibold text-gray-900 dark:text-white">
                {participant.profiles.name}
              </p>
            ) : null}
          </div>
        </div>

        {submitted ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="text-center py-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-2">
                Score Recorded!
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Measurements for {participantCode} have been saved.
              </p>
            </CardContent>
          </Card>
        ) : !selectedStation ? (
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader className="text-center">
                <CardTitle>Select Your Station</CardTitle>
                <CardDescription>
                  Choose the station you are operating to enter scores for{" "}
                  {participant ? participant.profiles.name : participantCode}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stationsLoading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center mx-auto mb-2">
                      <div className="w-4 h-4 bg-primary-foreground rounded-full" />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Loading stations...
                    </div>
                  </div>
                ) : stationsError ? (
                  <div className="text-center py-8 text-red-500">
                    Failed to load stations. Please refresh the page.
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {stations?.map((station) => {
                      const IconComponent = getIconByName(station.icon_name);
                      return (
                        <Button
                          key={station.id}
                          variant="outline"
                          onClick={() =>
                            handleStationSelect(
                              (station.station_type as StationType) ??
                                ("balance" as StationType)
                            )
                          }
                          className="h-auto p-6 flex flex-col items-center gap-4 hover:bg-muted/50"
                        >
                          <div
                            className={`p-4 rounded-full ${station.color_class} text-white`}
                          >
                            <IconComponent className="h-8 w-8" />
                          </div>
                          <div className="text-center">
                            <h3 className="font-semibold text-lg">
                              {station.name}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1 whitespace-normal break-words">
                              {station.description}
                            </p>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  {currentStation && (
                    <>
                      <div
                        className={`p-3 rounded-full ${currentStation.color_class} text-white`}
                      >
                        {(() => {
                          const IconComponent = getIconByName(
                            currentStation.icon_name
                          );
                          return <IconComponent className="h-6 w-6" />;
                        })()}
                      </div>
                      <div>
                        <CardTitle>{currentStation.name} Station</CardTitle>
                        <CardDescription>
                          Enter measurements for{" "}
                          {participant
                            ? participant.profiles.name
                            : participantCode}
                        </CardDescription>
                      </div>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedStation(null)}
                    size="sm"
                  >
                    ← Change Station
                  </Button>
                </div>

                {/* Show existing result if there's a conflict */}
                {existingResult && (
                  <div className="mb-6">
                    <Alert variant="destructive" className="mb-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {existingResult.error}
                      </AlertDescription>
                    </Alert>

                    <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/10">
                      <CardHeader>
                        <CardTitle className="text-orange-800 dark:text-orange-200 flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5" />
                          Existing Result Found
                        </CardTitle>
                        <CardDescription className="text-orange-700 dark:text-orange-300">
                          A result has already been recorded for this
                          participant and station.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="text-sm space-y-1">
                          <p>
                            <span className="font-medium">Participant:</span>{" "}
                            {existingResult.participantCode}
                          </p>
                          <p>
                            <span className="font-medium">Station:</span>{" "}
                            {existingResult.stationType}
                          </p>
                          <p>
                            <span className="font-medium">Recorded:</span>{" "}
                            {new Date(
                              existingResult.recordedAt
                            ).toLocaleString()}
                          </p>
                        </div>

                        {showDeleteConfirm ? (
                          <div className="space-y-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                            <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                              <AlertTriangle className="h-5 w-5" />
                              <span className="font-medium">
                                Confirm Deletion
                              </span>
                            </div>
                            <p className="text-sm text-red-700 dark:text-red-300">
                              Are you sure you want to delete the existing
                              result? This action cannot be undone.
                            </p>
                            <div className="flex gap-2">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleDeleteExistingResult}
                                disabled={deleteStationResult.isPending}
                              >
                                {deleteStationResult.isPending ? (
                                  <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                    Deleting...
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Yes, Delete
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={deleteStationResult.isPending}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-sm text-orange-700 dark:text-orange-300">
                              To enter new measurements, you must first delete
                              the existing result.
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowDeleteConfirm(true)}
                              className="border-orange-300 text-orange-800 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-200 dark:hover:bg-orange-900/20"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Existing Result
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Only show form if no existing result */}
                {!existingResult && (
                  <StationEntryForm
                    station={selectedStation}
                    participantCode={participantCode}
                    onSubmit={handleDataSubmit}
                    isSubmitting={submitStationResult.isPending}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
