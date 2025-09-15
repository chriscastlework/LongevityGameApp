"use client";

import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AuthenticatedLayout } from "@/components/layout/authenticated-layout";
import { RefreshCw, Activity, Heart, Zap, Scale } from "lucide-react";

// Mock participant data - in real implementation, this would come from auth context
const mockParticipant = {
  participant_code: "LFG-0001",
  full_name: "John Doe",
  organization: "Acme Corp",
  created_at: new Date().toISOString(),
};

const stations = [
  {
    id: "balance",
    name: "Balance Test",
    icon: Scale,
    description: "Test your balance and stability",
    color: "bg-blue-500",
  },
  {
    id: "breath",
    name: "Breath Hold",
    icon: Activity,
    description: "Measure your respiratory endurance",
    color: "bg-green-500",
  },
  {
    id: "grip",
    name: "Grip Strength",
    icon: Zap,
    description: "Test your hand and forearm strength",
    color: "bg-yellow-500",
  },
  {
    id: "health",
    name: "Health Metrics",
    icon: Heart,
    description: "Comprehensive health measurements",
    color: "bg-red-500",
  },
];

export default function ParticipatePage() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [qrValue, setQrValue] = useState("");

  // Update time every second and regenerate QR code
  useEffect(() => {
    const updateQR = () => {
      const now = new Date();
      setCurrentTime(now);

      // Create QR code data with participant info and timestamp for security
      const qrData = {
        participant_code: mockParticipant.participant_code,
        participant_id: "mock-uuid-123", // This would be real UUID in production
        timestamp: now.toISOString(),
        expires: new Date(now.getTime() + 5 * 60 * 1000).toISOString(), // 5 minute expiry
      };

      setQrValue(JSON.stringify(qrData));
    };

    updateQR();
    const interval = setInterval(updateQR, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleRefreshQR = () => {
    const now = new Date();
    setCurrentTime(now);

    const qrData = {
      participant_code: mockParticipant.participant_code,
      participant_id: "mock-uuid-123",
      timestamp: now.toISOString(),
      expires: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
    };

    setQrValue(JSON.stringify(qrData));
  };

  return (
    <AuthenticatedLayout
      title="Participate"
      subtitle="Join the fitness assessment"
      className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800"
    >
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome to the Longevity Fitness Games
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300">
            You're ready to begin your fitness assessment!
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Participant Info & QR Code */}
          <Card className="lg:sticky lg:top-8">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Your Participant Profile</CardTitle>
              <CardDescription>
                Present this QR code to station operators
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Participant Details */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Participant Code:</span>
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    {mockParticipant.participant_code}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Name:</span>
                  <span>{mockParticipant.full_name}</span>
                </div>
                {mockParticipant.organization && (
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Organization:</span>
                    <span>{mockParticipant.organization}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="font-medium">Registered:</span>
                  <span>{new Date(mockParticipant.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <Separator />

              {/* QR Code */}
              <div className="text-center space-y-4">
                <div className="bg-white p-6 rounded-lg inline-block shadow-sm">
                  {qrValue && (
                    <QRCodeSVG
                      value={qrValue}
                      size={200}
                      level="M"
                      includeMargin={true}
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    QR Code updates every 30 seconds for security
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshQR}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh QR Code
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Last updated: {currentTime.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stations Information */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Testing Stations</CardTitle>
                <CardDescription>
                  Visit each station with a trained operator to complete your assessment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {stations.map((station) => {
                    const IconComponent = station.icon;
                    return (
                      <div
                        key={station.id}
                        className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className={`p-3 rounded-full ${station.color} text-white`}>
                          <IconComponent className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">{station.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {station.description}
                          </p>
                        </div>
                        <Badge variant="outline">Ready</Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card>
              <CardHeader>
                <CardTitle>How it Works</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      <p className="font-medium">Present Your QR Code</p>
                      <p className="text-sm text-muted-foreground">
                        Show your QR code to the station operator when you arrive
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      <p className="font-medium">Complete the Assessment</p>
                      <p className="text-sm text-muted-foreground">
                        Follow the operator's instructions for each fitness test
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      <p className="font-medium">View Your Results</p>
                      <p className="text-sm text-muted-foreground">
                        Your scores are calculated automatically and added to the leaderboard
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <Button className="flex-1">
                    View Leaderboard
                  </Button>
                  <Button variant="outline" className="flex-1">
                    My Results
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}