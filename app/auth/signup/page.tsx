"use client";

import React, { Suspense } from "react";
import { useAuthContext } from "@/components/providers/auth-provider";
import { AuthRedirect } from "@/components/auth/auth-redirect";
import { EnhancedSignupForm } from "@/components/auth/enhanced-signup-form";
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

        {/* Navigation */}
        <div className="absolute top-6 left-6 right-6 z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <div className="w-4 h-4 bg-primary-foreground rounded-full" />
              </div>
              <span className="text-xl font-semibold text-foreground">
                The Longevity Fitness Games.
              </span>
            </div>
            <nav className="flex items-center gap-6">
              <Link
                href="/"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Home
              </Link>
              <Link
                href="/auth/login"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Join
              </Link>
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-md p-6">
          <div className="mb-8">
            <p className="text-sm text-muted-foreground mb-2">START FOR FREE</p>
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Create new account<span className="text-primary">.</span>
            </h1>
          </div>

          <EnhancedSignupForm />
        </div>
      </div>
    </DeepLinkProvider>
  );
}
