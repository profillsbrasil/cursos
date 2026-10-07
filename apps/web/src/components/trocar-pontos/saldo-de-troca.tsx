"use client";

import { cn } from "@cursos/ui/lib/utils";
import { ChevronDown, Flame, Star } from "lucide-react";
import { useCallback, useState } from "react";

import { fmtNum, fmtPts } from "@/lib/formato";

import { BOTAO_CONTORNO } from "./botoes";
import { ComoGanhar } from "./como-ganhar";

export function SaldoDeTroca({
  comoGanhar,
  pontosSemana,
  saldo,
}: {
  comoGanhar: readonly { pontos: number; rotulo: string }[];
  pontosSemana: number;
  saldo: number;
}) {
  const [aberta, setAberta] = useState(false);
  const alternar = useCallback(() => setAberta((a) => !a), []);
  return (
    <section
      aria-labelledby="saldo-titulo"
      className="relative overflow-clip rounded-[20px] bg-card p-(--pad) text-card-foreground ring-1 ring-border [--pad:clamp(20px,3.5vw,32px)]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-[40%] -right-[10%] size-[420px] rounded-full bg-[radial-gradient(closest-side,rgb(255_204_1/0.16),transparent)]"
      />
      <div className="relative flex flex-wrap items-center gap-x-7 gap-y-5">
        <span
          aria-hidden="true"
          className="grid size-18 flex-none place-items-center rounded-full bg-sol text-sobre-cor shadow-[0_10px_30px_rgb(255_204_1/0.25)]"
        >
          <Star className="size-9 fill-current" strokeWidth={1.4} />
        </span>
        <div className="min-w-0 flex-[1_1_220px]">
          <span className="text-[15px] text-muted-foreground" id="saldo-titulo">
            Seu saldo
          </span>
          <strong className="block font-extrabold text-[clamp(44px,7vw,64px)] text-titulo tabular-nums leading-[1.05] tracking-[-0.035em]">
            {fmtNum(saldo)}
            <small className="ml-1.5 font-semibold text-[0.42em] text-sol tracking-normal">
              pts
            </small>
          </strong>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-sol/14 px-3 py-1 font-semibold text-sm text-sol tabular-nums">
            <Flame aria-hidden="true" className="size-[15px]" />
            {`+${fmtPts(pontosSemana)} nesta semana`}
          </span>
        </div>
        <button
          aria-controls="como-ganhar"
          aria-expanded={aberta}
          className={cn(BOTAO_CONTORNO, "max-[520px]:w-full")}
          onClick={alternar}
          type="button"
        >
          Como ganhar pontos
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
              aberta && "rotate-180"
            )}
          />
        </button>
      </div>
      <ComoGanhar aberta={aberta} id="como-ganhar" regras={comoGanhar} />
    </section>
  );
}
