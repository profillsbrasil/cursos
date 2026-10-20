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

/** Os botões de um grupo da barra, sempre juntos na mesma linha. */
const GRUPO = "inline-flex items-center gap-1.5 @max-[40rem]/barra:gap-1";

/**
 * A barra mede o próprio contêiner, não a janela, porque a largura do player muda com
 * a coluna do curso. Os grupos são a (reproduzir e os saltos), b (volume), c (tempo e
 * "% visto") e d (legenda, Ajustes e tela cheia). Larga, uma linha só, com o c no
 * meio. Abaixo de 40rem, duas linhas: os botões em cima e o tempo com o "% visto"
 * embaixo, na largura toda. Abaixo de 24rem o slider sai e fica o botão de som; abaixo
 * de 18,5rem, que só um celular de 320 px alcança, o som desce para a linha do tempo,
 * e o aviso da conquista cobre o tempo enquanto aparece, porque não cabe só no vão.
 * Ali a primeira coluna tem os 38 px do botão de som, e o grupo a ocupa as duas
 * primeiras, para o tempo começar logo depois do som. A posição de cada grupo é
 * explícita, sem `grid-template-areas`, para a classe não levar aspas.
 */
const BARRA =
  "grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-x-1.5 gap-y-1 @max-[40rem]/barra:gap-x-1 @max-[18.5rem]/barra:grid-cols-[38px_auto_minmax(0,1fr)_auto]";
const LUGAR_A = "col-start-1 row-start-1 @max-[18.5rem]/barra:col-[1/3]";
const LUGAR_B =
  "col-start-2 row-start-1 @max-[18.5rem]/barra:col-start-1 @max-[18.5rem]/barra:row-start-2";
const LUGAR_C =
  "col-start-3 row-start-1 @max-[40rem]/barra:col-[1/-1] @max-[40rem]/barra:row-start-2 @max-[18.5rem]/barra:col-[2/-1]";
const LUGAR_D = "col-start-4 row-start-1";

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
      <div className="@container/barra" data-barra="">
        <div className={BARRA}>
          <span className={cn(GRUPO, LUGAR_A)}>
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
          </span>
          <span className={cn("inline-flex items-center gap-0.5", LUGAR_B)}>
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
            <span className="mr-1.5 @max-[24rem]/barra:hidden w-[84px] shrink-0">
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
          <span
            className={cn(
              "@max-[18.5rem]/barra:relative flex @max-[40rem]/barra:min-h-9 min-w-0 items-center gap-1.5 self-stretch",
              LUGAR_C
            )}
          >
            <span className="@max-[40rem]/barra:ml-2.5 ml-1.5 shrink-0 whitespace-nowrap font-mono text-[13px] text-muted-foreground tabular-nums">
              <b className="font-medium text-foreground">
                {mmss(estado.tempoSeg)}
              </b>{" "}
              / {mmss(estado.duracaoSeg)}
            </span>
            <StatusDoPlayer
              avisoAparente={avisoAparente}
              conquista={conquista}
              pct={estado.cobertura.pct}
            />
          </span>
          <span className={cn(GRUPO, LUGAR_D)}>
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
          </span>
        </div>
      </div>
    </PortalDoPlayer>
  );
}
