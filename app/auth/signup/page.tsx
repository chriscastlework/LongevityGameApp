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
    return <AuthRedirect />;
  }

  return (
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
  );
}
