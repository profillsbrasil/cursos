"use client";

import { buttonVariants } from "@cursos/ui/components/button";
import { cn } from "@cursos/ui/lib/utils";
import { RotateCcw } from "lucide-react";
import { useEffect } from "react";

// Corpo dos error.tsx do app: diz o que falhou e oferece tentar de novo.
export function TelaDeErro({
  error,
  retry,
  titulo,
}: {
  error: Error & { digest?: string };
  retry: () => void;
  titulo: string;
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
        {titulo}
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
