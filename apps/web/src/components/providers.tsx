"use client";

import { Toaster } from "@cursos/ui/components/sonner";
import { TooltipProvider } from "@cursos/ui/components/tooltip";

import { OPCOES_DO_TOAST } from "@/components/opcoes-do-toast";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TooltipProvider>{children}</TooltipProvider>
      {/* Sem ThemeProvider, o Toaster cairia em "system"; a prop vence o useTheme(). */}
      <Toaster theme="dark" toastOptions={OPCOES_DO_TOAST} />
    </>
  );
}
