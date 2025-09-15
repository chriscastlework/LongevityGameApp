import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AuthAPI, type SignupData, type LoginCredentials, type AuthResponse } from "@/lib/api/auth";

// Auth query using API instead of direct Supabase
export function useAuthQuery() {
  return useQuery({
    queryKey: ["auth", "session"],
    queryFn: async () => {
      try {
        const response = await AuthAPI.getSession();
        return response.data || { user: null, profile: null, participant: null };
      } catch (error: any) {
        // If session validation fails, user is not authenticated
        console.log("Session validation failed:", error.message);
        return { user: null, profile: null, participant: null };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    // Only refetch if we don't have user data
    enabled: true,
  });
}

// Login mutation using API
export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const response = await AuthAPI.login(credentials);
      return response;
    },
    onSuccess: (data) => {
      // Store access token
      if (data.data?.session?.access_token) {
        AuthAPI.setAccessToken(data.data.session.access_token);

        // Store in localStorage for persistence (optional)
        localStorage.setItem('access_token', data.data.session.access_token);
        if (data.data.session.refresh_token) {
          localStorage.setItem('refresh_token', data.data.session.refresh_token);
        }
      }

      // Invalidate and refetch session data
      queryClient.invalidateQueries({ queryKey: ["auth", "session"] });
    },
    onError: (error) => {
      console.error("Login error:", error);
    },
  });
}

// Signup mutation using API
export function useSignupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (signupData: SignupData) => {
      const response = await AuthAPI.signup(signupData);
      return response;
    },
    onSuccess: (data) => {
      // Store access token if provided
      if (data.data?.session?.access_token) {
        AuthAPI.setAccessToken(data.data.session.access_token);

        // Store in localStorage for persistence
        localStorage.setItem('access_token', data.data.session.access_token);
        if (data.data.session.refresh_token) {
          localStorage.setItem('refresh_token', data.data.session.refresh_token);
        }
      }

      // Invalidate and refetch session data
      queryClient.invalidateQueries({ queryKey: ["auth", "session"] });
    },
    onError: (error) => {
      console.error("Signup error:", error);
    },
  });
}

// Logout mutation using API
export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await AuthAPI.logout();
      return response;
    },
    onSuccess: () => {
      // Clear local storage
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');

      // Clear auth state
      queryClient.setQueryData(["auth", "session"], { user: null, profile: null, participant: null });
      queryClient.invalidateQueries({ queryKey: ["auth", "session"] });
    },
    onError: (error) => {
      console.error("Logout error:", error);

      // Even if logout fails, clear local state
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      queryClient.setQueryData(["auth", "session"], { user: null, profile: null, participant: null });
    },
  });
}

// Initialize auth state on app load
export function initializeAuth() {
  const token = localStorage.getItem('access_token');
  if (token) {
    AuthAPI.setAccessToken(token);
  }
}

// Helper hook to get auth state
export function useAuth() {
  const { data, isLoading, error } = useAuthQuery();

  return {
    user: data?.user || null,
    profile: data?.profile || null,
    participant: data?.participant || null,
    isAuthenticated: !!data?.user,
    isLoading,
    error,
  };
}

// Keep original hooks for backward compatibility but mark as deprecated
/**
 * @deprecated Use useSignupMutation instead
 */
export const useParticipantSignupMutation = useSignupMutation;