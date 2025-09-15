"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Heart, Zap, Scale, QrCode, Users } from "lucide-react";

import { QRScanner } from "@/components/station/qr-scanner";
import { StationEntryForm } from "@/components/station/station-entry-form";
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

// Mock operator data
const mockOperator = {
  id: "operator-1",
  name: "Dr. Sarah Johnson",
  station: "balance" as StationType,
  certifications: ["CPR", "First Aid", "Fitness Assessment"],
};

export default function StationOperatorPage() {
  const [selectedStation, setSelectedStation] = useState<StationType>(mockOperator.station);
  const [scannedParticipant, setScannedParticipant] = useState<any>(null);
  const [showScanner, setShowScanner] = useState(false);

  const currentStation = stations.find(s => s.id === selectedStation);

  const handleQRScan = (data: string) => {
    try {
      const participantData = JSON.parse(data);

      // Verify QR code hasn't expired
      const expiryTime = new Date(participantData.expires);
      if (expiryTime < new Date()) {
        alert("QR Code has expired. Please ask participant to refresh their code.");
        return;
      }

      setScannedParticipant(participantData);
      setShowScanner(false);
    } catch (error) {
      alert("Invalid QR Code");
    }
  };

  const handleDataSubmit = (measurements: any) => {
    console.log("Submitting measurements:", {
      participant: scannedParticipant,
      station: selectedStation,
      measurements,
      operator: mockOperator.id,
    });

    // Here we would submit to Supabase
    alert(`Measurements recorded for ${scannedParticipant.participant_code}`);
    setScannedParticipant(null);
  };

  if (!currentStation) return null;

  const StationIcon = currentStation.icon;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${currentStation.color} text-white`}>
              <StationIcon className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {currentStation.name} Station
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Operator: {mockOperator.name}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {mockOperator.certifications.map((cert) => (
              <Badge key={cert} variant="secondary">
                {cert}
              </Badge>
            ))}
          </div>
        </div>

        <Tabs value={selectedStation} onValueChange={(value) => setSelectedStation(value as StationType)}>
          <TabsList className="grid w-full grid-cols-4">
            {stations.map((station) => {
              const IconComp = station.icon;
              return (
                <TabsTrigger key={station.id} value={station.id} className="gap-2">
                  <IconComp className="h-4 w-4" />
                  {station.name}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {stations.map((station) => (
            <TabsContent key={station.id} value={station.id} className="mt-6">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Participant Scanner */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <QrCode className="h-5 w-5" />
                      Scan Participant QR Code
                    </CardTitle>
                    <CardDescription>
                      Scan the participant's QR code to begin the assessment
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!scannedParticipant ? (
                      <div className="space-y-4">
                        {showScanner ? (
                          <div className="space-y-4">
                            <QRScanner onScan={handleQRScan} />
                            <Button
                              variant="outline"
                              onClick={() => setShowScanner(false)}
                              className="w-full"
                            >
                              Cancel Scan
                            </Button>
                          </div>
                        ) : (
                          <Button
                            onClick={() => setShowScanner(true)}
                            className="w-full"
                          >
                            <QrCode className="h-4 w-4 mr-2" />
                            Start QR Code Scanner
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                          <div className="flex items-center gap-3 mb-3">
                            <Users className="h-5 w-5 text-green-600" />
                            <span className="font-semibold text-green-900 dark:text-green-100">
                              Participant Ready
                            </span>
                          </div>
                          <div className="space-y-1 text-sm">
                            <p><span className="font-medium">Code:</span> {scannedParticipant.participant_code}</p>
                            <p><span className="font-medium">ID:</span> {scannedParticipant.participant_id}</p>
                            <p><span className="font-medium">Scanned:</span> {new Date(scannedParticipant.timestamp).toLocaleString()}</p>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          onClick={() => setScannedParticipant(null)}
                          className="w-full"
                        >
                          Scan Different Participant
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Measurement Entry */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <station.icon className="h-5 w-5" />
                      {station.name} Measurements
                    </CardTitle>
                    <CardDescription>
                      {station.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {scannedParticipant ? (
                      <StationEntryForm
                        station={station.id}
                        participantCode={scannedParticipant.participant_code}
                        onSubmit={handleDataSubmit}
                      />
                    ) : (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <station.icon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>Scan participant QR code to begin</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}