"use client";

import { ReactNode } from "react";
import { MobileAuthHeader } from "./mobile-auth-header";
import { useAuthContext } from "@/components/providers/auth-provider";
import { Loader2 } from "lucide-react";

interface AuthenticatedLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
}

export function AuthenticatedLayout({
  children,
  title = "Longevity Game",
  subtitle,
  className = "min-h-screen bg-background",
}: AuthenticatedLayoutProps) {
  const { isLoading, isAuthenticated } = useAuthContext();

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <div className="text-sm text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated (this should be handled by middleware, but just in case)
  if (!isAuthenticated) {
    if (typeof window !== "undefined") {
      window.location.href = "/auth/login";
    }
    return null;
  }

  return (
    <div className={className}>
      <MobileAuthHeader title={title} subtitle={subtitle} />
      {children}
    </div>
  );
}
