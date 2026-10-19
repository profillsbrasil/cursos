"use client";

import type { Conquista } from "@cursos/api/dominio/registro";
import { Button } from "@cursos/ui/components/button";
import { Slider } from "@cursos/ui/components/slider";
import { Tooltip, TooltipTrigger } from "@cursos/ui/components/tooltip";
import { cn } from "@cursos/ui/lib/utils";
import {
  Captions,
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
import { type ComponentProps, type RefObject, useCallback, useId } from "react";

import { DICA_SECUNDARIA } from "@/components/casca/estilo";
import { mmss } from "@/lib/formato";
import type { EstadoDaSessao } from "@/lib/player/sessao";
import type { ComandoDoTeclado } from "@/lib/player/teclado";

import { AjustesDoPlayer } from "./ajustes-do-player";
import { DicaDoPlayer, PortalDoPlayer } from "./dica-do-player";
import { ICONE } from "./partes";
import { StatusDoPlayer } from "./status-do-player";

/** O botão de ícone com a dica do nome e, quando há, da tecla. */
function BotaoComDica({
  children,
  className,
  dica,
  tecla,
  ...props
}: ComponentProps<typeof Button> & { dica: string; tecla?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            className={cn(ICONE, className)}
            size="icon-lg"
            variant="ghost"
            {...props}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <DicaDoPlayer>
        {dica}
        {tecla ? <span className={DICA_SECUNDARIA}> {tecla}</span> : null}
      </DicaDoPlayer>
    </Tooltip>
  );
}

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
  atalhosAbertos,
  aoMudarAtalhos,
  avisoAparente,
  comandar,
  conquista,
  estado,
  podeTelaCheia,
  portal,
  telaCheia,
}: {
  atalhosAbertos: boolean;
  aoMudarAtalhos: (abertos: boolean) => void;
  avisoAparente: boolean;
  comandar: (c: ComandoDoTeclado) => void;
  conquista: Conquista | null;
  estado: EstadoDaSessao;
  podeTelaCheia: boolean;
  portal: RefObject<HTMLElement | null>;
  telaCheia: boolean;
}) {
  const idVolume = useId();
  const { legenda, reproducao, volume } = estado;
  const tocando = reproducao.tipo === "tocando";
  const semPlayer =
    reproducao.tipo === "carregando" || reproducao.tipo === "indisponivel";
  const nivelAudivel = volume.mudo ? 0 : volume.nivel;

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
  const alternarLegenda = useCallback(
    () => comandar({ tipo: "legenda" }),
    [comandar]
  );
  const alternarTelaCheia = useCallback(
    () => comandar({ tipo: "tela_cheia" }),
    [comandar]
  );

  return (
    <PortalDoPlayer value={portal}>
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        <BotaoComDica
          aria-label={tocando ? "Pausar" : "Reproduzir"}
          dica={tocando ? "Pausar" : "Reproduzir"}
          disabled={semPlayer}
          onClick={alternar}
          tecla="Espaço"
        >
          {tocando ? (
            <Pause aria-hidden="true" fill="currentColor" strokeWidth={0} />
          ) : (
            <Play aria-hidden="true" fill="currentColor" strokeWidth={0} />
          )}
        </BotaoComDica>
        <BotaoComDica
          aria-label="Voltar 10 segundos"
          dica="Voltar 10 s"
          disabled={semPlayer}
          onClick={voltar}
          tecla="J"
        >
          <RotateCcw aria-hidden="true" />
          <Dez />
        </BotaoComDica>
        <BotaoComDica
          aria-label="Avançar 10 segundos"
          dica="Avançar 10 s"
          disabled={semPlayer}
          onClick={avancar}
          tecla="L"
        >
          <RotateCw aria-hidden="true" />
          <Dez />
        </BotaoComDica>
        <span className="inline-flex items-center gap-0.5">
          <BotaoComDica
            aria-label={nivelAudivel === 0 ? "Ativar som" : "Silenciar"}
            aria-pressed={nivelAudivel === 0}
            dica={nivelAudivel === 0 ? "Ativar som" : "Silenciar"}
            onClick={silenciar}
            tecla="M"
          >
            <IconeDoVolume nivel={nivelAudivel} />
          </BotaoComDica>
          <span className="sr-only" id={idVolume}>
            Volume
          </span>
          <span className="mr-1.5 w-[84px] shrink-0">
            <Slider
              aria-labelledby={idVolume}
              className="py-2 [&_[data-slot=slider-range]]:bg-foreground [&_[data-slot=slider-thumb]]:size-3.5 [&_[data-slot=slider-thumb]]:rounded-full [&_[data-slot=slider-thumb]]:border-0 [&_[data-slot=slider-thumb]]:bg-titulo [&_[data-slot=slider-thumb]]:transition-transform [&_[data-slot=slider-thumb]]:duration-150 [&_[data-slot=slider-thumb]]:ease-forte [&_[data-slot=slider-thumb]]:hover:scale-125 [&_[data-slot=slider-thumb]]:motion-reduce:transition-none [&_[data-slot=slider-track]]:h-1.5 [&_[data-slot=slider-track]]:rounded-full [&_[data-slot=slider-track]]:bg-trilho"
              max={100}
              min={0}
              onValueChange={definirVolume}
              step={5}
              value={nivelAudivel}
            />
          </span>
        </span>
        <span className="ml-1.5 font-mono text-[13px] text-muted-foreground tabular-nums">
          <b className="font-medium text-foreground">{mmss(estado.tempoSeg)}</b>{" "}
          / {mmss(estado.duracaoSeg)}
        </span>
        <span className="flex-1" />
        <StatusDoPlayer
          avisoAparente={avisoAparente}
          conquista={conquista}
          pct={estado.cobertura.pct}
        />
        <BotaoComDica
          aria-label="Legendas"
          aria-pressed={legenda}
          className={cn(
            legenda
              ? "after:absolute after:inset-x-2.5 after:bottom-[5px] after:h-0.5 after:rounded-full after:bg-sol"
              : "text-muted-foreground"
          )}
          dica={legenda ? "Desligar legendas" : "Ligar legendas"}
          onClick={alternarLegenda}
          tecla="C"
        >
          <Captions aria-hidden="true" />
        </BotaoComDica>
        <AjustesDoPlayer
          aoMudarAtalhos={aoMudarAtalhos}
          atalhosAbertos={atalhosAbertos}
          comandar={comandar}
          estado={estado}
          portal={portal}
        />
        {podeTelaCheia ? (
          <BotaoComDica
            aria-label={telaCheia ? "Sair da tela cheia" : "Tela cheia"}
            dica={telaCheia ? "Sair da tela cheia" : "Tela cheia"}
            onClick={alternarTelaCheia}
            tecla="F"
          >
            {telaCheia ? (
              <Minimize aria-hidden="true" />
            ) : (
              <Maximize aria-hidden="true" />
            )}
          </BotaoComDica>
        ) : null}
      </div>
    </PortalDoPlayer>
  );
}
