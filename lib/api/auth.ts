// Client-side authentication API service
// This can be used by both web and mobile applications

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  fullName: string;
  email: string;
  password: string;
  dateOfBirth: string;
  gender: 'male' | 'female';
  jobTitle: string;
  organization: string;
  phone?: string;
  consentWellness: boolean;
  consentLiability: boolean;
  consentData: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  email_confirmed_at?: string;
  last_sign_in_at?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  date_of_birth: string;
  gender: 'male' | 'female';
  job_title: string;
  organisation: string;
  created_at: string;
  updated_at: string;
}

export interface UserParticipant {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface AuthSession {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    user: AuthUser;
    profile?: UserProfile | null;
    participant?: UserParticipant | null;
    session?: AuthSession;
  };
  message: string;
  error?: string;
  details?: string;
}

// Base API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

// Helper function to make API requests
async function apiRequest(endpoint: string, options: RequestInit = {}): Promise<AuthResponse> {
  const url = `${API_BASE_URL}/api${endpoint}`;

  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.details || data.error || 'API request failed');
  }

  return data;
}

// Authentication API functions
export class AuthAPI {
  private static accessToken: string | null = null;

  // Set access token for authenticated requests
  static setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  // Get authorization header
  private static getAuthHeader(): Record<string, string> {
    return this.accessToken
      ? { Authorization: `Bearer ${this.accessToken}` }
      : {};
  }

  // Sign up a new user
  static async signup(signupData: SignupData): Promise<AuthResponse> {
    try {
      const response = await apiRequest('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(signupData),
      });

      // Store access token if provided
      if (response.data?.session?.access_token) {
        this.setAccessToken(response.data.session.access_token);
      }

      return response;
    } catch (error: any) {
      throw new Error(`Signup failed: ${error.message}`);
    }
  }

  // Sign in an existing user
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      // Store access token if provided
      if (response.data?.session?.access_token) {
        this.setAccessToken(response.data.session.access_token);
      }

      return response;
    } catch (error: any) {
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  // Sign out the current user
  static async logout(): Promise<AuthResponse> {
    try {
      const response = await apiRequest('/auth/logout', {
        method: 'POST',
        headers: {
          ...this.getAuthHeader(),
        },
      });

      // Clear stored token
      this.setAccessToken(null);

      return response;
    } catch (error: any) {
      // Clear token even if logout fails
      this.setAccessToken(null);
      throw new Error(`Logout failed: ${error.message}`);
    }
  }

  // Get current user session
  static async getSession(): Promise<AuthResponse> {
    try {
      const response = await apiRequest('/auth/session', {
        method: 'GET',
        headers: {
          ...this.getAuthHeader(),
        },
      });

      return response;
    } catch (error: any) {
      throw new Error(`Session validation failed: ${error.message}`);
    }
  }

  // Refresh access token (if needed)
  static async refreshToken(refreshToken: string): Promise<AuthResponse> {
    // This would typically hit a refresh endpoint
    // For now, we'll redirect to login
    throw new Error('Session expired. Please login again.');
  }
}

// Export individual functions for convenience
export const signup = AuthAPI.signup.bind(AuthAPI);
export const login = AuthAPI.login.bind(AuthAPI);
export const logout = AuthAPI.logout.bind(AuthAPI);
export const getSession = AuthAPI.getSession.bind(AuthAPI);
export const setAccessToken = AuthAPI.setAccessToken.bind(AuthAPI);

// Export the class as default
export default AuthAPI;