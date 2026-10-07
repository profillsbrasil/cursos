"use client";

import type { Conquista } from "@cursos/api/dominio/registro";
import { cn } from "@cursos/ui/lib/utils";
import { Check } from "lucide-react";
import { useState } from "react";

import { plural } from "@/lib/formato";

/** Fixo no canto e fora do player: nada fica por cima do vídeo. */
export function AvisoAulaAssistida({
  conquista,
}: {
  conquista: Conquista | null;
}) {
  // A última conquista fica no DOM enquanto o aviso some, para o texto não sumir antes.
  const [ultima, setUltima] = useState(conquista);
  if (conquista && conquista !== ultima) {
    setUltima(conquista);
  }
  const visivel = conquista !== null;
  return (
    <div
      aria-live="polite"
      className={cn(
        "fixed right-6 bottom-6 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-3.5 rounded-[14px] border border-chart-5 bg-card px-[18px] py-3.5 shadow-[0_16px_40px_rgb(0_0_0/0.5)] transition-[translate,opacity] duration-500 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none max-[480px]:right-4 max-[480px]:bottom-4",
        visivel
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-4 opacity-0"
      )}
      role="status"
    >
      {ultima ? (
        <>
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ceu text-sobre-cor">
            <Check
              aria-hidden="true"
              className="size-[18px]"
              strokeWidth={2.4}
            />
          </span>
          <span className="min-w-0">
            <b className="block text-titulo">Aula assistida</b>
            <small className="text-[13px] text-muted-foreground">
              Você viu 90% dos trechos desta aula.
              {ultima.bonusSequencia
                ? ` Sequência de ${plural(ultima.sequenciaDias, "dia útil", "dias úteis")}: +${ultima.bonusSequencia} pts.`
                : null}
            </small>
          </span>
          <span className="ml-1 font-mono font-semibold text-lg text-sol tabular-nums">
            +{ultima.pontos} pts
          </span>
        </>
      ) : null}
    </div>
  );
}
