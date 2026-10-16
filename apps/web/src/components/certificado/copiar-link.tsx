"use client";

import { cn } from "@cursos/ui/lib/utils";
import { Link2 } from "lucide-react";
import { useCallback } from "react";
import { toast } from "sonner";

import { BOTAO_CONTORNO } from "@/components/casca/botoes";

export function CopiarLink({ url }: { url: string }) {
  const copiar = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link de conferência copiado.");
    } catch {
      toast.error(`Não deu para copiar. O link é ${url}`);
    }
  }, [url]);
  return (
    <button
      className={cn(BOTAO_CONTORNO, "w-full")}
      onClick={copiar}
      type="button"
    >
      <Link2 aria-hidden="true" />
      Copiar link de conferência
    </button>
  );
}
