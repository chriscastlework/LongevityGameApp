"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AuthenticatedLayout } from "@/components/layout/authenticated-layout";
import { Users, CheckCircle } from "lucide-react";
import { StationEntryForm } from "@/components/station/station-entry-form";
import { useAuthContext } from "@/components/providers/auth-provider";
import { isOperator } from "@/lib/auth/useApiAuth";
import { useStations } from "@/lib/hooks/useStations";
import { useParticipant } from "@/lib/hooks/useParticipant";
import { getIconByName } from "@/lib/utils/icons";
import type { StationType } from "@/lib/types/database";

export default function StationParticipantPage() {
  const params = useParams();
  const router = useRouter();
  const participantCode = params.participantCode as string;
  const { isAuthenticated, isLoading, user, profile } = useAuthContext();
  const { data: stations, isLoading: stationsLoading, error: stationsError } = useStations();
  const { data: participant, isLoading: participantLoading, error: participantError } = useParticipant(participantCode);
  const [selectedStation, setSelectedStation] = useState<StationType | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const currentStation = selectedStation && stations ? stations.find(s => s.station_type === selectedStation) : null;

  // Redirect to login if not authenticated, preserving the current URL
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const currentPath = `/stations/${participantCode}`;
      const loginUrl = `/auth/login?redirect=${encodeURIComponent(currentPath)}`;
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
                This page is only accessible to users with operator or admin roles.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Your current role: {profile?.role || 'Unknown'}
              </p>
              <Button
                onClick={() => router.push('/participate')}
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
  };

  const handleDataSubmit = async (measurements: any) => {
    if (!selectedStation) return;

    try {
      const response = await fetch('/api/station-results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantCode,
          stationType: selectedStation,
          measurements,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save measurements');
      }

      const result = await response.json();
      console.log("Successfully saved measurements:", result);

      setSubmitted(true);

      // Reset after a delay
      setTimeout(() => {
        setSubmitted(false);
        setSelectedStation(null);
      }, 3000);
    } catch (error) {
      console.error("Error saving measurements:", error);
      // You might want to show an error toast or alert here
      alert(`Failed to save measurements: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
              Participant: <Badge variant="secondary" className="text-lg px-3 py-1 ml-2">{participantCode}</Badge>
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
                  Choose the station you are operating to enter scores for {participant ? participant.profiles.name : participantCode}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stationsLoading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center mx-auto mb-2">
                      <div className="w-4 h-4 bg-primary-foreground rounded-full" />
                    </div>
                    <div className="text-sm text-muted-foreground">Loading stations...</div>
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
                          onClick={() => handleStationSelect(station.station_type)}
                          className="h-auto p-6 flex flex-col items-center gap-4 hover:bg-muted/50"
                        >
                          <div className={`p-4 rounded-full ${station.color_class} text-white`}>
                            <IconComponent className="h-8 w-8" />
                          </div>
                          <div className="text-center">
                            <h3 className="font-semibold text-lg">{station.name}</h3>
                            <p className="text-sm text-muted-foreground mt-1">
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
                      <div className={`p-3 rounded-full ${currentStation.color_class} text-white`}>
                        {(() => {
                          const IconComponent = getIconByName(currentStation.icon_name);
                          return <IconComponent className="h-6 w-6" />;
                        })()}
                      </div>
                      <div>
                        <CardTitle>{currentStation.name} Station</CardTitle>
                        <CardDescription>
                          Enter measurements for {participant ? participant.profiles.name : participantCode}
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
                <StationEntryForm
                  station={selectedStation}
                  participantCode={participantCode}
                  onSubmit={handleDataSubmit}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}