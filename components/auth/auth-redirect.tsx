"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthContext } from "@/components/providers/auth-provider";
import { useDeepLink } from "./deep-link-provider";

export function AuthRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading, user } = useAuthContext();
  const {
    getRedirectUrl,
    getCompetitionId,
    clearRedirectUrl,
    clearCompetitionId,
  } = useDeepLink();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    // Don't redirect if still loading or already redirected
    if (isLoading || hasRedirected) return;

    if (isAuthenticated && user) {
      // Get redirect URL from deep link context or URL params
      const contextRedirect = getRedirectUrl();
      const paramRedirect = searchParams.get("redirect");
      const competitionId = getCompetitionId();

      let redirectTo = "/competitions";

      // Prefer context redirect, then param redirect, then competition context
      if (
        contextRedirect &&
        contextRedirect.startsWith("/") &&
        !contextRedirect.startsWith("//")
      ) {
        redirectTo = contextRedirect;
      } else if (
        paramRedirect &&
        paramRedirect.startsWith("/") &&
        !paramRedirect.startsWith("//")
      ) {
        redirectTo = paramRedirect;
      } else if (competitionId) {
        redirectTo = `/competitions/${competitionId}`;
      }

      setHasRedirected(true);
      clearRedirectUrl();
      clearCompetitionId();
      router.replace(redirectTo);
    }
  }, [
    isAuthenticated,
    isLoading,
    user,
    router,
    searchParams,
    hasRedirected,
    getRedirectUrl,
    getCompetitionId,
    clearRedirectUrl,
    clearCompetitionId,
  ]);

  // Show loading indicator while redirecting
  if (isAuthenticated && !hasRedirected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center mb-2">
            <div className="w-4 h-4 bg-primary-foreground rounded-full" />
          </div>
          <div className="text-sm text-muted-foreground">Redirecting...</div>
        </div>
      </div>
    );
  }

  return null;
}
