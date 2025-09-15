import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createBrowserClient } from "@/lib/supabase/client";
import type { ParticipantProfileInsert, SignupFormData } from "@/lib/types/database";

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "session"] });
    },
  });
}

// Participant signup mutation - works with existing database schema
export function useParticipantSignupMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: SignupFormData) => {
      const supabase = createBrowserClient();

      // Only create auth user if email and password are provided
      if (formData.email && formData.password) {
        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
            },
          },
        });
        if (authError) throw authError;
        if (!authData.user) throw new Error("No user returned from auth signup");

        // Create profile record with the user's ID
        const profileData: ParticipantProfileInsert = {
          id: authData.user.id,
          name: formData.fullName,
          email: formData.email,
          date_of_birth: formData.dateOfBirth,
          gender: formData.gender,
          job_title: formData.jobTitle,
          organisation: formData.organization, // Convert American to British spelling
        };

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .insert([profileData])
          .select()
          .single();

        if (profileError) throw profileError;

        // Create participant record linking to the auth user
        const { data: participant, error: participantError } = await supabase
          .from("participants")
          .insert([{ user_id: authData.user.id }])
          .select()
          .single();

        if (participantError) throw participantError;

        return { user: authData.user, profile, participant };
      } else {
        // For users without email/password, we can't create profiles
        // since they require auth user ID due to foreign key constraint
        throw new Error("Email and password are required for signup");
      }
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
