/**
 * Authentication components with deep link support
 *
 * This module provides a comprehensive set of React components for handling
 * authentication flows with deep linking support for competition entry.
 */

// Core Components
export { DeepLinkProvider, useDeepLink } from "./deep-link-provider";
export { EnhancedLoginForm } from "./enhanced-login-form";
export { EnhancedSignupForm } from "./enhanced-signup-form";
export { PasswordResetFlow } from "./password-reset-flow";

// Existing Components (preserved)
export { AuthRedirect } from "./auth-redirect";
export { RouteGuard } from "./route-guard";

// Hooks
export * from "../../lib/auth/auth-hooks";

// Types
export * from "../../lib/types/auth";

// Utilities
export * from "../../lib/auth/deep-link-utils";

/**
 * Convenience wrapper component that combines DeepLinkProvider with AuthProvider
 */
import React from "react";
import { DeepLinkProvider } from "./deep-link-provider";
import { AuthProvider } from "../providers/auth-provider";
import { EnhancedLoginForm } from "./enhanced-login-form";
import { EnhancedSignupForm } from "./enhanced-signup-form";
import { PasswordResetFlow } from "./password-reset-flow";

interface EnhancedAuthProviderProps {
  children: React.ReactNode;
}

export function EnhancedAuthProvider({ children }: EnhancedAuthProviderProps) {
  return (
    <AuthProvider>
      <DeepLinkProvider>{children}</DeepLinkProvider>
    </AuthProvider>
  );
}

/**
 * Authentication component presets for common use cases
 */

// Login page with deep link support
export function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <EnhancedLoginForm />
      </div>
    </div>
  );
}

// Signup page with deep link support
export function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <EnhancedSignupForm />
      </div>
    </div>
  );
}

// Password reset page
export function ResetPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <PasswordResetFlow />
      </div>
    </div>
  );
}
