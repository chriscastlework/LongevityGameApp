"use client";

import React, { Suspense } from "react";
import { useAuthContext } from "@/components/providers/auth-provider";
import { AuthRedirect } from "@/components/auth/auth-redirect";
import { ParticipantSignupForm } from "@/components/auth/participant-signup-form";
import { DeepLinkProvider } from "@/components/auth/deep-link-provider";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  const { isAuthenticated } = useAuthContext();

  if (isAuthenticated) {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center mb-2">
              <div className="w-4 h-4 bg-primary-foreground rounded-full" />
            </div>
            <div className="text-sm text-muted-foreground">Redirecting...</div>
          </div>
        </div>
      }>
        <AuthRedirect />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center mb-2">
            <div className="w-4 h-4 bg-primary-foreground rounded-full" />
          </div>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </div>
      </div>
    }>
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
            <ParticipantSignupForm />
          </div>
        </div>
      </DeepLinkProvider>
    </Suspense>
  );
}
