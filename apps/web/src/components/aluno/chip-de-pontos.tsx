"use client";

import { cn } from "@cursos/ui/lib/utils";
import { Star } from "lucide-react";
import { useSyncExternalStore } from "react";

import { fmtPts } from "@/lib/formato";
import { anelDosPontos } from "@/lib/player/sinal";

const apagado = () => false;

export function ChipDePontos({
  className,
  saldo,
}: {
  className: string;
  saldo: number;
}) {
  const aceso = useSyncExternalStore(
    anelDosPontos.assinar,
    anelDosPontos.aceso,
    apagado
  );
  return (
    <span
      className={cn(
        className,
        "text-sol transition-shadow duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
        aceso && "shadow-[0_0_0_3px_rgb(255_204_1/0.35)]"
      )}
    >
      <Star aria-hidden="true" className="size-4" />
      <span className="sr-only">Saldo de pontos para trocar por cursos:</span>
      <b className="font-semibold">{fmtPts(saldo)}</b>
    </span>
  );
}
