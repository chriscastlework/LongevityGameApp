"use client";

import type React from "react";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/providers/auth-provider";

interface RouteGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  redirectTo?: string;
}

export function RouteGuard({
  children,
  requireAuth = true,
  requireAdmin = false,
  redirectTo = "/auth/login",
}: RouteGuardProps) {
  const router = useRouter();
  const { isAuthenticated, user, profile, isLoading } = useAuthContext();

  useEffect(() => {
    if (isLoading) return;

    // Check authentication requirement
    if (requireAuth && !isAuthenticated) {
      const currentPath = window.location.pathname;
      router.push(`${redirectTo}?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }

    // Check admin requirement
    if (requireAdmin && (!profile || !profile.is_admin)) {
      router.push("/competitions");
      return;
    }

    // If user is authenticated but trying to access auth pages
    if (!requireAuth && isAuthenticated && redirectTo === "/auth/login") {
      router.push("/competitions");
      return;
    }
  }, [
    isAuthenticated,
    user,
    profile,
    isLoading,
    requireAuth,
    requireAdmin,
    redirectTo,
    router,
  ]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Don't render children if auth requirements aren't met
  if (requireAuth && !isAuthenticated) return null;
  if (requireAdmin && (!profile || !profile.is_admin)) return null;

  return <>{children}</>;
}
