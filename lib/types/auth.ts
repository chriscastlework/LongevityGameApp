/**
 * TypeScript interfaces and types for authentication and deep linking
 */

import type { User } from "@supabase/supabase-js";
import type { Profile } from "./database";

/**
 * Authentication state interface
 */
export interface AuthState {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

/**
 * Authentication flow types
 */
export type AuthFlow = "login" | "signup" | "reset" | "oauth";

/**
 * OAuth provider types
 */
export type OAuthProvider = "google" | "github" | "discord" | "apple";

/**
 * OAuth state interface
 */
export interface OAuthState {
  provider: OAuthProvider;
  redirectUrl?: string;
  competitionId?: string;
  timestamp: number;
  nonce: string;
}

/**
 * Authentication form data interfaces
 */
export interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface SignupFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms?: boolean;
  subscribeNewsletter?: boolean;
}

export interface ResetRequestFormData {
  email: string;
}

export interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

/**
 * Authentication hook return types
 */
export interface UseEnhancedLoginReturn {
  login: (email: string, password: string) => Promise<AuthOperationResult>;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

export interface UseEnhancedSignupReturn {
  signup: (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => Promise<AuthOperationResult>;
  isLoading: boolean;
  error: string | null;
  isSuccess: boolean;
}

export interface UsePasswordResetReturn {
  sendResetEmail: (email: string) => Promise<AuthOperationResult>;
  resetPassword: (newPassword: string) => Promise<AuthOperationResult>;
  isLoading: boolean;
  error: string | null;
  isEmailSent: boolean;
  isSuccess: boolean;
}

export interface UseOAuthAuthReturn {
  signInWithOAuth: (provider: OAuthProvider) => Promise<AuthOperationResult>;
  isLoading: boolean;
  error: string | null;
}

export interface UseCompetitionAuthReturn {
  isAuthenticated: boolean;
  user: User | null;
  hasEntry: boolean | null;
  isCheckingEntry: boolean;
  canEnter: boolean;
  alreadyEntered: boolean;
  getAuthRequiredMessage: () => string;
  buildAuthUrl: (flow?: "login" | "signup") => string;
  refreshEntry: () => Promise<void>;
}

export interface UseLogoutReturn {
  logout: (redirectTo?: string) => Promise<void>;
  isLoading: boolean;
}

/**
 * Authentication operation result
 */
export interface AuthOperationResult {
  success: boolean;
  error?: string;
  data?: any;
}

/**
 * Competition entry status
 */
export interface CompetitionEntryStatus {
  canEnter: boolean;
  hasEntry: boolean;
  isActive: boolean;
  isLoading: boolean;
  error: string | null;
  requiresAuth: boolean;
  competition: {
    id: string;
    title: string;
    description: string;
    startDate: string;
    endDate: string;
    maxParticipants?: number;
    isActive: boolean;
  } | null;
}

/**
 * Route guard props interface
 */
export interface RouteGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  requireEmailConfirmed?: boolean;
  redirectTo?: string;
  competitionId?: string;
  onUnauthorized?: () => void;
}

/**
 * Auth callback handler states
 */
export type AuthCallbackState =
  | "loading"
  | "success"
  | "error"
  | "invalid_state"
  | "access_denied"
  | "expired";

/**
 * Auth callback handler props
 */
export interface AuthCallbackHandlerProps {
  provider?: OAuthProvider;
  className?: string;
  onSuccess?: (user: User) => void;
  onError?: (error: string) => void;
}

/**
 * Deep link provider props
 */
export interface DeepLinkProviderProps {
  children: React.ReactNode;
  defaultRedirect?: string;
  maxSessionAge?: number; // in minutes
}

/**
 * Auth form component props
 */
export interface AuthFormProps {
  className?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  showAlternativeActions?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
}

/**
 * Competition entry guard props
 */
export interface CompetitionEntryGuardProps {
  children: React.ReactNode;
  competitionId?: string;
  requireAuth?: boolean;
  showCompetitionInfo?: boolean;
  className?: string;
  onUnauthorized?: () => void;
  onAlreadyEntered?: () => void;
}

/**
 * Session storage interface
 */
export interface AuthSessionStorage {
  set: (key: string, value: any, expiryMinutes?: number) => void;
  get: (key: string) => any | null;
  remove: (key: string) => void;
  clear: () => void;
  clearExpired: () => void;
}

/**
 * Auth error types
 */
export type AuthErrorType =
  | "invalid_credentials"
  | "email_not_confirmed"
  | "user_already_registered"
  | "invalid_email"
  | "weak_password"
  | "access_denied"
  | "invalid_request"
  | "server_error"
  | "temporarily_unavailable"
  | "timeout"
  | "network_error"
  | "unknown_error";

/**
 * Auth error interface
 */
export interface AuthError {
  type: AuthErrorType;
  message: string;
  code?: string;
  details?: any;
  timestamp: number;
}

/**
 * Password strength levels
 */
export type PasswordStrength = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * Password strength result
 */
export interface PasswordStrengthResult {
  score: PasswordStrength;
  feedback: string[];
  isValid: boolean;
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumbers: boolean;
    hasSpecialChars: boolean;
  };
}

/**
 * Auth configuration interface
 */
export interface AuthConfig {
  // URLs
  loginUrl: string;
  signupUrl: string;
  resetUrl: string;
  redirectAfterLogin: string;
  redirectAfterSignup: string;
  redirectAfterLogout: string;

  // OAuth
  enabledProviders: OAuthProvider[];
  oauthRedirectUrl: string;

  // Features
  enableSignup: boolean;
  enablePasswordReset: boolean;
  enableEmailConfirmation: boolean;
  enableSocialAuth: boolean;

  // Password requirements
  passwordMinLength: number;
  requirePasswordComplexity: boolean;

  // Session
  sessionTimeoutMinutes: number;
  extendSessionOnActivity: boolean;

  // Deep linking
  preserveRedirectParams: boolean;
  maxRedirectDepth: number;
}

/**
 * Re-export commonly used types
 */
export type { User, Session } from "@supabase/supabase-js";
export type { Profile, Competition, CompetitionEntry } from "./database";
