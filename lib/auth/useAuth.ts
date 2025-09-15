import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createBrowserClient } from "@/lib/supabase/client";
import type { ParticipantProfileInsert, SignupFormData, UserRole } from "@/lib/types/database";

// Fetch current user session/profile
export function useAuthQuery() {
  return useQuery({
    queryKey: ["auth", "session"],
    queryFn: async () => {
      const supabase = createBrowserClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) throw error;
      if (!user) return { user: null, profile: null };
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      return { user, profile: profileError ? null : profile };
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

// Role-based access utilities
export function useUserRole() {
  const { data: authData } = useAuthQuery();
  return authData?.profile?.role || null;
}

export function useHasRole(requiredRole: UserRole) {
  const userRole = useUserRole();
  if (!userRole) return false;

  // Role hierarchy: admin > operator > participant
  const roleHierarchy: Record<UserRole, number> = {
    participant: 1,
    operator: 2,
    admin: 3,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

export function useIsAdmin() {
  return useHasRole('admin');
}

export function useIsOperator() {
  const userRole = useUserRole();
  return userRole === 'operator' || userRole === 'admin';
}

export function useIsParticipant() {
  const userRole = useUserRole();
  return userRole === 'participant';
}

// Login mutation
export function useLoginMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }) => {
      const supabase = createBrowserClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      if (!data.user) throw new Error("No user returned");
      // Optionally fetch profile
      let profile = null;
      try {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single();
        if (!profileError) profile = profileData;
      } catch {}
      return { user: data.user, profile };
    },
    onSuccess: async (result) => {
      // Refresh claims after successful login
      try {
        await fetch('/api/auth/hooks/set-claims', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        console.warn('Failed to refresh claims:', error);
      }

      queryClient.invalidateQueries({ queryKey: ["auth", "session"] });
    },
  });
}

// Participant signup mutation - uses server-side API for proper auth handling
export function useParticipantSignupMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: SignupFormData) => {
      // Call the server-side signup API that handles everything in one transaction
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
          dateOfBirth: formData.dateOfBirth,
          gender: formData.gender,
          jobTitle: formData.jobTitle,
          organization: formData.organization,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Signup failed');
      }

      const data = await response.json();
      return data.data; // Contains user, profile, participant, and session
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "session"] });
    },
  });
}

// Legacy signup mutation (keep for backward compatibility)
export function useSignupMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      email,
      password,
      firstName,
      lastName,
    }: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
    }) => {
      const supabase = createBrowserClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });
      if (error) throw error;
      if (!data.user) throw new Error("Signup succeeded but no user returned");
      return { user: data.user };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "session"] });
    },
  });
}
