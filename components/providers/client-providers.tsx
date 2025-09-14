"use client";

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { AuthProvider } from "./auth-provider";
import { PWAProvider } from "./pwa-provider";
import { DeepLinkProvider } from "../auth/deep-link-provider";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => new QueryClient());
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <DeepLinkProvider>
          <PWAProvider>
            {children || <div>No children provided</div>}
          </PWAProvider>
        </DeepLinkProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </AuthProvider>
    </QueryClientProvider>
  );
}