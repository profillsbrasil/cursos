"use client";

import { buttonVariants } from "@cursos/ui/components/button";
import { cn } from "@cursos/ui/lib/utils";
import { RotateCcw } from "lucide-react";
import { useEffect } from "react";

// No Next 16.3 a função de recuperação do error.js se chama retry (antes, reset).
export default function ErroMeusCursos({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div
      className="grid justify-items-start gap-3 rounded-[20px] bg-card p-8 ring-1 ring-border"
      role="alert"
    >
      <h1 className="font-bold text-2xl text-titulo tracking-tight">
        Não deu para carregar seus cursos
      </h1>
      <p className="text-muted-foreground">
        A conexão com o servidor falhou. Seu progresso está salvo; tente de novo
        em instantes.
      </p>
      <button
        className={cn(
          buttonVariants(),
          "h-11 gap-2 rounded-full px-5 font-semibold text-sm focus-visible:outline-2 focus-visible:outline-ceu focus-visible:outline-solid focus-visible:outline-offset-2"
        )}
        onClick={retry}
        type="button"
      >
        <RotateCcw aria-hidden="true" />
        Tentar de novo
      </button>
    </div>
  );
}
