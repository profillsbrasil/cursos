"use client";

import { useAuth } from "@clerk/nextjs";
import { Toaster } from "@cursos/ui/components/sonner";
import { TooltipProvider } from "@cursos/ui/components/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useEffect } from "react";

import { setClerkAuthTokenGetter } from "@/utils/clerk-auth";
import { queryClient } from "@/utils/trpc";

function ClerkApiAuthBridge() {
  const { getToken } = useAuth();

  useEffect(() => {
    setClerkAuthTokenGetter(getToken);

    return () => {
      setClerkAuthTokenGetter(null);
    };
  }, [getToken]);

  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ClerkApiAuthBridge />
      <TooltipProvider>{children}</TooltipProvider>
      <ReactQueryDevtools />
      {/* Sem ThemeProvider, o Toaster cairia em "system"; a prop vence o useTheme(). */}
      <Toaster richColors theme="dark" />
    </QueryClientProvider>
  );
}
