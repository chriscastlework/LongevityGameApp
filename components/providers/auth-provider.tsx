"use client";

import React, { createContext, useContext } from "react";
import { useAuthQuery } from "@/lib/auth/useAuth";

interface AuthContextType {
  user: any;
  profile: any;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: any;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading, error, refetch } = useAuthQuery();
  const user = data?.user || null;
  const profile = data?.profile || null;
  const isAuthenticated = !!user;

  const refreshUser = () => {
    refetch();
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, isAuthenticated, isLoading, error, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}
