"use client";

import React, { createContext, useContext, useEffect } from "react";
import { useAuthQuery, initializeAuth } from "@/lib/auth/useApiAuth";

interface AuthContextType {
  user: any;
  profile: any;
  participant: any;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: any;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Initialize auth token from localStorage on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  const { data, isLoading, error, refetch } = useAuthQuery();
  const user = data?.user || null;
  const profile = data?.profile || null;
  const participant = data?.participant || null;
  const isAuthenticated = !!user;

  const refreshUser = () => {
    refetch();
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, participant, isAuthenticated, isLoading, error, refreshUser }}
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
