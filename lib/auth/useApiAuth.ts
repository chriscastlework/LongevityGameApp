import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createBrowserClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/types/database";

// Fetch current user session/profile (moved from useAuth.ts)
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

// Initialize auth (placeholder function)
export function initializeAuth() {
  // This can be used to initialize auth state from localStorage if needed
  console.log("Auth initialized");
}

// Get current user's role
export function useCurrentUserRole() {
  return useQuery({
    queryKey: ["auth", "role"],
    queryFn: async () => {
      const response = await fetch('/api/admin/roles');
      if (!response.ok) {
        throw new Error('Failed to fetch user role');
      }
      const data = await response.json();
      return data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Update a user's role (admin only)
export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: UserRole }) => {
      const response = await fetch('/api/admin/roles', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, newRole }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user role');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch user lists and role queries
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["auth", "role"] });
    },
  });
}

// Get all users (admin/operator only)
export function useAdminUsers({
  page = 1,
  limit = 50,
  role,
  search,
}: {
  page?: number;
  limit?: number;
  role?: UserRole;
  search?: string;
} = {}) {
  return useQuery({
    queryKey: ["admin", "users", page, limit, role, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (role) params.set('role', role);
      if (search) params.set('search', search);

      const response = await fetch(`/api/admin/users?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Role-based permission utilities
export function hasPermission(userRole: UserRole | null, requiredRole: UserRole): boolean {
  if (!userRole) return false;

  const roleHierarchy: Record<UserRole, number> = {
    participant: 1,
    operator: 2,
    admin: 3,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

export function isAdmin(userRole: UserRole | null): boolean {
  return userRole === 'admin';
}

export function isOperator(userRole: UserRole | null): boolean {
  return userRole === 'operator' || userRole === 'admin';
}

export function isParticipant(userRole: UserRole | null): boolean {
  return userRole === 'participant';
}

// Refresh user claims manually
export function useRefreshClaims() {
  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/hooks/set-claims', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to refresh claims');
      }

      return response.json();
    },
  });
}