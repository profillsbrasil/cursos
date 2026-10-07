"use client";

import { PCT_AULA_ASSISTIDA } from "@cursos/api/dominio/regras";
import type { Trecho } from "@cursos/api/dominio/trechos";
import { type PointerEvent, useCallback, useState } from "react";

import { mmss } from "@/lib/formato";

const pct = (seg: number, duracaoSeg: number) =>
  `${Math.min(100, Math.max(0, (100 * seg) / duracaoSeg))}%`;

export function BarraDeTrechos({
  aoBuscar,
  duracaoSeg,
  tempoSeg,
  trechos,
}: {
  aoBuscar: (seg: number) => void;
  duracaoSeg: number;
  tempoSeg: number;
  trechos: readonly Trecho[];
}) {
  const [arraste, setArraste] = useState<number | null>(null);
  const cabeca = arraste ?? tempoSeg;

  const segDoPonteiro = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const caixa = e.currentTarget.getBoundingClientRect();
      const fracao = (e.clientX - caixa.left) / caixa.width;
      return Math.min(1, Math.max(0, fracao)) * duracaoSeg;
    },
    [duracaoSeg]
  );
  const cancelar = useCallback(() => setArraste(null), []);
  const comecar = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      setArraste(segDoPonteiro(e));
    },
    [segDoPonteiro]
  );
  const mover = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (arraste !== null) {
        setArraste(segDoPonteiro(e));
      }
    },
    [arraste, segDoPonteiro]
  );
  const soltar = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (arraste !== null) {
        aoBuscar(segDoPonteiro(e));
        setArraste(null);
      }
    },
    [aoBuscar, arraste, segDoPonteiro]
  );

  return (
    <div
      aria-label="Posição no vídeo"
      aria-valuemax={duracaoSeg}
      aria-valuemin={0}
      aria-valuenow={Math.floor(cabeca)}
      aria-valuetext={`${mmss(cabeca)} de ${mmss(duracaoSeg)}`}
      className="relative flex h-[22px] cursor-pointer touch-none items-center rounded-md focus-visible:outline-2 focus-visible:outline-ceu focus-visible:outline-solid focus-visible:outline-offset-4"
      onPointerCancel={cancelar}
      onPointerDown={comecar}
      onPointerMove={mover}
      onPointerUp={soltar}
      role="slider"
      tabIndex={0}
    >
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-trilho ring-1 ring-muted-foreground ring-inset">
        {trechos.map((t) => (
          <div
            className="absolute inset-y-0 bg-sol"
            key={t.inicio}
            style={{
              left: pct(t.inicio, duracaoSeg),
              width: pct(t.fim - t.inicio, duracaoSeg),
            }}
          />
        ))}
      </div>
      <span
        className="pointer-events-none absolute inset-y-[1px] w-0.5 rounded-full bg-ceu"
        style={{ left: `${PCT_AULA_ASSISTIDA}%` }}
        title="90% da aula"
      />
      <span
        className="pointer-events-none absolute top-1/2 -mt-2 -ml-2 size-4 rounded-full bg-titulo shadow-[0_2px_6px_rgb(0_0_0/0.5)]"
        style={{ left: pct(cabeca, duracaoSeg) }}
      />
    </div>
  );
}
