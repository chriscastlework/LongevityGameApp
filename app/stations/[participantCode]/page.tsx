"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AuthenticatedLayout } from "@/components/layout/authenticated-layout";
import { Activity, Heart, Zap, Scale, Users, CheckCircle } from "lucide-react";
import { StationEntryForm } from "@/components/station/station-entry-form";
import { useAuthContext } from "@/components/providers/auth-provider";
import { isOperator } from "@/lib/auth/useApiAuth";
import type { StationType } from "@/lib/types/database";

const stations = [
  {
    id: "balance" as StationType,
    name: "Balance Test",
    icon: Scale,
    description: "Measure balance and stability",
    color: "bg-blue-500",
  },
  {
    id: "breath" as StationType,
    name: "Breath Hold",
    icon: Activity,
    description: "Test respiratory endurance",
    color: "bg-green-500",
  },
  {
    id: "grip" as StationType,
    name: "Grip Strength",
    icon: Zap,
    description: "Measure hand/forearm strength",
    color: "bg-yellow-500",
  },
  {
    id: "health" as StationType,
    name: "Health Metrics",
    icon: Heart,
    description: "Comprehensive health measurements",
    color: "bg-red-500",
  },
];

export default function StationParticipantPage() {
  const params = useParams();
  const router = useRouter();
  const participantCode = params.participantCode as string;
  const { isAuthenticated, isLoading, user, profile } = useAuthContext();
  const [selectedStation, setSelectedStation] = useState<StationType | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const currentStation = selectedStation ? stations.find(s => s.id === selectedStation) : null;

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

  const handleDataSubmit = (measurements: any) => {
    console.log("Submitting measurements:", {
      participantCode,
      station: selectedStation,
      measurements,
    });

    // Here we would submit to Supabase results table
    setSubmitted(true);

    // Reset after a delay
    setTimeout(() => {
      setSubmitted(false);
      setSelectedStation(null);
    }, 3000);
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
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Participant: <Badge variant="secondary" className="text-lg px-3 py-1 ml-2">{participantCode}</Badge>
          </p>
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
                  Choose the station you are operating to enter scores for participant {participantCode}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {stations.map((station) => {
                    const IconComponent = station.icon;
                    return (
                      <Button
                        key={station.id}
                        variant="outline"
                        onClick={() => handleStationSelect(station.id)}
                        className="h-auto p-6 flex flex-col items-center gap-4 hover:bg-muted/50"
                      >
                        <div className={`p-4 rounded-full ${station.color} text-white`}>
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
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-full ${currentStation?.color} text-white`}>
                    {currentStation && <currentStation.icon className="h-6 w-6" />}
                  </div>
                  <div>
                    <CardTitle>{currentStation?.name} Station</CardTitle>
                    <CardDescription>
                      Enter measurements for participant {participantCode}
                    </CardDescription>
                  </div>
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