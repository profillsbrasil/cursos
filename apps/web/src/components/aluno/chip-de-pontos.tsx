"use client";

import { cn } from "@cursos/ui/lib/utils";
import { Star } from "lucide-react";
import Link from "next/link";
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
    <Link
      className={cn(
        className,
        "text-sol transition-[box-shadow,border-color] duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-sol focus-visible:outline-2 focus-visible:outline-ceu focus-visible:outline-solid focus-visible:outline-offset-2 motion-reduce:transition-none",
        aceso && "shadow-[0_0_0_3px_rgb(255_204_1/0.35)]"
      )}
      href="/trocar-pontos"
    >
      <Star aria-hidden="true" className="size-4" />
      <span className="sr-only">Saldo de pontos para trocar por cursos:</span>
      <b className="font-semibold">{fmtPts(saldo)}</b>
    </Link>
  );
}
