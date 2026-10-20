"use client";

import { useAuth } from "@clerk/nextjs";
import { Toaster } from "@cursos/ui/components/sonner";
import { TooltipProvider } from "@cursos/ui/components/tooltip";
import { useEffect } from "react";

import { OPCOES_DO_TOAST } from "@/components/opcoes-do-toast";
import { setClerkAuthTokenGetter } from "@/utils/clerk-auth";

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
    <>
      <ClerkApiAuthBridge />
      <TooltipProvider>{children}</TooltipProvider>
      {/* Sem ThemeProvider, o Toaster cairia em "system"; a prop vence o useTheme(). */}
      <Toaster theme="dark" toastOptions={OPCOES_DO_TOAST} />
    </>
  );
}
