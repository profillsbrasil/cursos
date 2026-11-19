"use client";

import type { RegraDeGanho } from "@cursos/api/dominio/pontos";
import { cn } from "@cursos/ui/lib/utils";
import { ChevronDown, Star, TrendingUp } from "lucide-react";
import { useCallback, useState } from "react";

import { BOTAO_CONTORNO } from "@/components/casca/botoes";
import { CARTAO } from "@/components/casca/cartoes";
import { fmtNum, fmtPts } from "@/lib/formato";

import { ComoGanhar } from "./como-ganhar";

export function SaldoDeTroca({
  comoGanhar,
  pontosSemana,
  saldo,
  temCursoTrocavelNaVitrine,
}: {
  comoGanhar: readonly RegraDeGanho[];
  pontosSemana: number;
  saldo: number;
  temCursoTrocavelNaVitrine: boolean;
}) {
  const [aberta, setAberta] = useState(false);
  const alternar = useCallback(() => setAberta((a) => !a), []);

  return (
    <section
      aria-labelledby="saldo-titulo"
      className={cn(
        CARTAO,
        "text-card-foreground relative overflow-clip p-(--pad) [--pad:clamp(20px,3.5vw,32px)]"
      )}
    >
      {temCursoTrocavelNaVitrine ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-[40%] -right-[10%] size-[420px] rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--sol)_16%,transparent),transparent)]"
        />
      ) : null}
      <div className="relative flex flex-wrap items-center gap-x-7 gap-y-5">
        <span
          aria-hidden="true"
          className={cn(
            "bg-sol text-sobre-cor grid size-18 flex-none place-items-center rounded-full",
            temCursoTrocavelNaVitrine && "shadow-brilho-do-saldo"
          )}
        >
          <Star className="size-9 fill-current" strokeWidth={1.4} />
        </span>
        <div className="min-w-0 flex-[1_1_220px]">
          <span className="text-muted-foreground text-base" id="saldo-titulo">
            Seu saldo
          </span>
          <strong className="text-titulo block text-[clamp(44px,7vw,64px)] leading-[1.05] font-extrabold tracking-[-0.035em] tabular-nums">
            {fmtNum(saldo)}
            <small className="text-sol ml-1.5 text-[0.42em] font-semibold tracking-normal">
              pts
            </small>
          </strong>
          {pontosSemana > 0 ? (
            <span className="bg-sol/14 text-sol mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold tabular-nums">
              <TrendingUp aria-hidden="true" className="size-[15px]" />
              {`+${fmtPts(pontosSemana)} nesta semana`}
            </span>
          ) : null}
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
              "ease-forte transition-transform duration-200 motion-reduce:transition-none",
              aberta && "rotate-180"
            )}
          />
        </button>
      </div>
      <ComoGanhar aberta={aberta} id="como-ganhar" regras={comoGanhar} />
    </section>
  );
}
