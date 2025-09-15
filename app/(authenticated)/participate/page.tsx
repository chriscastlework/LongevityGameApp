"use client";

import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthenticatedLayout } from "@/components/layout/authenticated-layout";
import { Activity, Heart, Zap, Scale, Mail, CheckCircle } from "lucide-react";
import { useAuthContext } from "@/components/providers/auth-provider";
import { useSearchParams, useRouter } from "next/navigation";

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
  const { user, profile, refreshUser } = useAuthContext();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [qrValue, setQrValue] = useState("");

  // Check if user's email is confirmed
  const isEmailConfirmed = user?.email_confirmed_at != null;

  // Check if user just confirmed their email and refresh auth context
  useEffect(() => {
    const confirmed = searchParams.get('confirmed');
    if (confirmed === 'true' && user) {
      // Small delay to ensure backend has processed the confirmation
      setTimeout(() => {
        refreshUser();
      }, 1000);
    }
  }, [searchParams, user, refreshUser]);

  // Set QR code URL (only for confirmed users)
  useEffect(() => {
    if (!isEmailConfirmed || !user || !profile) return;

    const participantCode = `LFG-${user.id.slice(-4).toUpperCase()}`;
    const qrUrl = `${window.location.origin}/stations/${participantCode}`;
    setQrValue(qrUrl);
  }, [isEmailConfirmed, user, profile]);


  const handleResendConfirmation = async () => {
    try {
      // Call the resend confirmation API endpoint
      const response = await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        alert('Confirmation email sent! Please check your inbox.');
      } else {
        alert('Failed to send confirmation email. Please try again.');
      }
    } catch (error) {
      console.error('Error resending confirmation:', error);
      alert('Failed to send confirmation email. Please try again.');
    }
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
            {isEmailConfirmed
              ? "You're ready to begin your fitness assessment!"
              : "Please confirm your email to access your QR code"
            }
          </p>
        </div>

        {/* Email confirmation alert */}
        {!isEmailConfirmed && (
          <div className="max-w-2xl mx-auto mb-8">
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>
                  Please check your email and click the confirmation link to activate your account and access your QR code.
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResendConfirmation}
                  className="ml-2"
                >
                  Resend Email
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Participant Info & QR Code */}
          <Card className="lg:sticky lg:top-8">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Your Participant Profile</CardTitle>
              <CardDescription>
                {isEmailConfirmed
                  ? "Present this QR code to station operators"
                  : "QR code will be available after email confirmation"
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Participant Details */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Participant Code:</span>
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    {user ? `LFG-${user.id.slice(-4).toUpperCase()}` : "Pending"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Name:</span>
                  <span>{profile?.name || "Loading..."}</span>
                </div>
                {profile?.organisation && (
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Organization:</span>
                    <span>{profile.organisation}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="font-medium">Email Status:</span>
                  <div className="flex items-center gap-2">
                    {isEmailConfirmed ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-green-600 dark:text-green-400">Confirmed</span>
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 text-yellow-500" />
                        <span className="text-yellow-600 dark:text-yellow-400">Pending</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* QR Code or Confirmation Message */}
              <div className="text-center space-y-4">
                {isEmailConfirmed ? (
                  <>
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
                        Scan this QR code to access the station entry page
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="bg-muted/50 p-6 rounded-lg">
                    <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="font-semibold mb-2">Email Confirmation Required</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Your QR code will appear here once you confirm your email address
                    </p>
                    <Button onClick={handleResendConfirmation} variant="outline" size="sm">
                      Resend Confirmation Email
                    </Button>
                  </div>
                )}
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
                        <Badge variant="outline">
                          {isEmailConfirmed ? "Ready" : "Confirm Email"}
                        </Badge>
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
                      <p className="font-medium">Confirm Your Email</p>
                      <p className="text-sm text-muted-foreground">
                        Check your email and click the confirmation link to activate your account
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                      2
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
                      3
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
                      4
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
                  <Button
                    className="flex-1"
                    disabled={!isEmailConfirmed}
                    onClick={() => router.push('/leaderboard')}
                  >
                    View Leaderboard
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled={!isEmailConfirmed}
                    onClick={() => router.push('/profile')}
                  >
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