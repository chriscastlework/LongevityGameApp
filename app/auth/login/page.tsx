"use client";

import React, { Suspense } from "react";
import { useAuthContext } from "@/components/providers/auth-provider";
import { AuthRedirect } from "@/components/auth/auth-redirect";
import { EnhancedLoginForm } from "@/components/auth/enhanced-login-form";
import { DeepLinkProvider } from "@/components/auth/deep-link-provider";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuthContext();

  // Only show loading if not authenticated and loading
  if (isLoading && !isAuthenticated) {
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

  if (isAuthenticated) {
    return <AuthRedirect />;
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <DeepLinkProvider>
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background">
          {/* Background Image */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30"
            style={{
              backgroundImage: "url(/images/mountain-landscape.jpg)",
            }}
          />

          {/* Content */}
          <div className="relative z-10 w-full max-w-md p-6">
            {/* Header */}
            <div className="flex items-center justify-center mb-8">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 bg-primary-foreground rounded-full" />
                </div>
                <span className="text-xl font-semibold text-foreground">
                  The Longevity Fitness Games.
                </span>
              </div>
            </div>

            <Card className="bg-card/90 backdrop-blur-sm border-border">
              <CardHeader className="pb-4">
                {/* Enhanced form includes its own header */}
              </CardHeader>
              <CardContent>
                <EnhancedLoginForm />
              </CardContent>
            </Card>
          </div>
        </div>
      </DeepLinkProvider>
    </Suspense>
  );
}
