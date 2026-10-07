"use client";

import { VELOCIDADES } from "@cursos/api/dominio/regras";
import { Button } from "@cursos/ui/components/button";
import { Slider } from "@cursos/ui/components/slider";
import { cn } from "@cursos/ui/lib/utils";
import {
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useId } from "react";

import { fmtVelocidade, mmss } from "@/lib/formato";
import type { EstadoDaSessao } from "@/lib/player/sessao";
import type { ComandoDoTeclado } from "@/lib/player/teclado";

const ICONE =
  "relative size-[38px] rounded-[10px] text-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-ceu focus-visible:outline-solid focus-visible:outline-offset-2 dark:hover:bg-accent [&_svg:not([class*='size-'])]:size-[18px]";

/** O "10" dentro da seta circular, como no protótipo. */
function Dez() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 grid place-items-center pt-px font-bold font-sans text-[7px]"
    >
      10
    </span>
  );
}

function IconeDoVolume({ nivel }: { nivel: number }) {
  if (nivel === 0) {
    return <VolumeX aria-hidden="true" />;
  }
  return nivel < 50 ? (
    <Volume1 aria-hidden="true" />
  ) : (
    <Volume2 aria-hidden="true" />
  );
}

export function ControlesDoPlayer({
  comandar,
  estado,
  podeTelaCheia,
  telaCheia,
}: {
  comandar: (c: ComandoDoTeclado) => void;
  estado: EstadoDaSessao;
  podeTelaCheia: boolean;
  telaCheia: boolean;
}) {
  const idVolume = useId();
  const { reproducao, velocidade, volume } = estado;
  const tocando = reproducao.tipo === "tocando";
  const semPlayer =
    reproducao.tipo === "carregando" || reproducao.tipo === "indisponivel";
  const nivelAudivel = volume.mudo ? 0 : volume.nivel;
  const proxima =
    VELOCIDADES[(VELOCIDADES.indexOf(velocidade) + 1) % VELOCIDADES.length] ??
    1;

  const alternar = useCallback(
    () => comandar({ tipo: "alternar" }),
    [comandar]
  );
  const voltar = useCallback(
    () => comandar({ seg: -10, tipo: "saltar" }),
    [comandar]
  );
  const avancar = useCallback(
    () => comandar({ seg: 10, tipo: "saltar" }),
    [comandar]
  );
  // Sem som no nível 0, o botão devolve metade do volume, como no protótipo.
  const silenciar = useCallback(
    () =>
      volume.nivel === 0
        ? comandar({ nivel: 50, tipo: "definir_volume" })
        : comandar({ tipo: "mudo" }),
    [comandar, volume.nivel]
  );
  const definirVolume = useCallback(
    (v: number | readonly number[]) =>
      comandar({
        nivel: Array.isArray(v) ? (v[0] ?? 0) : (v as number),
        tipo: "definir_volume",
      }),
    [comandar]
  );
  const trocarVelocidade = useCallback(
    () => comandar({ tipo: "velocidade", valor: proxima }),
    [comandar, proxima]
  );
  const alternarTelaCheia = useCallback(
    () => comandar({ tipo: "tela_cheia" }),
    [comandar]
  );

  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
      <Button
        aria-label={tocando ? "Pausar" : "Reproduzir"}
        className={ICONE}
        disabled={semPlayer}
        onClick={alternar}
        size="icon-lg"
        variant="ghost"
      >
        {tocando ? (
          <Pause aria-hidden="true" fill="currentColor" strokeWidth={0} />
        ) : (
          <Play aria-hidden="true" fill="currentColor" strokeWidth={0} />
        )}
      </Button>
      <Button
        aria-label="Voltar 10 segundos"
        className={ICONE}
        disabled={semPlayer}
        onClick={voltar}
        size="icon-lg"
        variant="ghost"
      >
        <RotateCcw aria-hidden="true" />
        <Dez />
      </Button>
      <Button
        aria-label="Avançar 10 segundos"
        className={ICONE}
        disabled={semPlayer}
        onClick={avancar}
        size="icon-lg"
        variant="ghost"
      >
        <RotateCw aria-hidden="true" />
        <Dez />
      </Button>
      <span className="inline-flex items-center gap-0.5">
        <Button
          aria-label={nivelAudivel === 0 ? "Ativar som" : "Silenciar"}
          aria-pressed={nivelAudivel === 0}
          className={ICONE}
          onClick={silenciar}
          size="icon-lg"
          variant="ghost"
        >
          <IconeDoVolume nivel={nivelAudivel} />
        </Button>
        <span className="sr-only" id={idVolume}>
          Volume
        </span>
        <Slider
          aria-labelledby={idVolume}
          className="mr-1.5 w-[84px] py-2 [&_[data-slot=slider-range]]:bg-foreground [&_[data-slot=slider-thumb]]:size-3.5 [&_[data-slot=slider-thumb]]:rounded-full [&_[data-slot=slider-thumb]]:border-0 [&_[data-slot=slider-thumb]]:bg-titulo [&_[data-slot=slider-thumb]]:focus-visible:outline-2 [&_[data-slot=slider-thumb]]:focus-visible:outline-ceu [&_[data-slot=slider-thumb]]:focus-visible:outline-solid [&_[data-slot=slider-thumb]]:focus-visible:outline-offset-2 [&_[data-slot=slider-track]]:h-1.5 [&_[data-slot=slider-track]]:rounded-full [&_[data-slot=slider-track]]:bg-trilho"
          max={100}
          min={0}
          onValueChange={definirVolume}
          step={5}
          value={nivelAudivel}
        />
      </span>
      <span className="ml-1.5 font-mono text-[13px] text-muted-foreground tabular-nums">
        <b className="font-medium text-foreground">{mmss(estado.tempoSeg)}</b> /{" "}
        {mmss(estado.duracaoSeg)}
      </span>
      <span className="flex-1" />
      <span className="mr-1.5 inline-flex items-center gap-2 text-[13px] text-muted-foreground">
        <i aria-hidden="true" className="size-2.5 rounded-[3px] bg-sol" />
        <span>
          <b className="font-semibold text-foreground tabular-nums">
            {estado.cobertura.pct}%
          </b>{" "}
          visto
          <span className="sr-only"> dos trechos desta aula</span>
        </span>
      </span>
      <Button
        aria-label={`Velocidade ${fmtVelocidade(velocidade)}. Trocar para ${fmtVelocidade(proxima)}`}
        className={cn(
          ICONE,
          "w-auto px-2.5 font-mono font-semibold text-[13px]"
        )}
        disabled={semPlayer}
        onClick={trocarVelocidade}
        size="icon-lg"
        variant="ghost"
      >
        {fmtVelocidade(velocidade)}
      </Button>
      {podeTelaCheia ? (
        <Button
          aria-label={telaCheia ? "Sair da tela cheia" : "Tela cheia"}
          className={ICONE}
          onClick={alternarTelaCheia}
          size="icon-lg"
          variant="ghost"
        >
          {telaCheia ? (
            <Minimize aria-hidden="true" />
          ) : (
            <Maximize aria-hidden="true" />
          )}
        </Button>
      ) : null}
    </div>
  );
}
