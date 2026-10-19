"use client";

import type { AulaNoPlayer } from "@cursos/api/dominio/aula";
import type { VideoDaAula } from "@cursos/api/dominio/tipos";
import { cn } from "@cursos/ui/lib/utils";
import { useCallback } from "react";

import { usePlayerDaAula } from "@/lib/player/use-player-da-aula";

import { BarraDeTrechos } from "./barra-de-trechos";
import { CabecalhoDaAula, NavegacaoEntreAulas } from "./cabecalho-da-aula";
import { ControlesDoPlayer } from "./controles-do-player";
import { FimDoVideo } from "./fim-do-video";
import { CAIXA_DO_VIDEO } from "./partes";
import { ProblemaDoPlayer } from "./problema-do-player";

export function PlayerDaAula({
  dados,
  inicioSeg,
  video,
}: {
  dados: AulaNoPlayer;
  inicioSeg: number;
  video: VideoDaAula;
}) {
  const p = usePlayerDaAula({
    aulaId: dados.aula.id,
    duracaoSeg: dados.aula.duracaoSeg,
    estudo: dados.estudo,
    inicioSeg,
    video,
  });
  const { comandar } = p;
  const rever = useCallback(() => {
    comandar({ seg: 0, tipo: "buscar" });
    comandar({ tipo: "alternar" });
  }, [comandar]);
  const terminou = p.estado.reproducao.tipo === "terminou";
  return (
    <div className="grid min-w-0 gap-4">
      <CabecalhoDaAula dados={dados} />
      <section
        aria-label="Player da aula"
        className="overflow-hidden rounded-[20px] border border-border bg-background [&:fullscreen]:flex [&:fullscreen]:flex-col [&:fullscreen]:rounded-none [&:fullscreen]:border-0"
        id="video"
        ref={p.refContainer}
        tabIndex={-1}
      >
        <div className="bg-black [:fullscreen_&]:min-h-0 [:fullscreen_&]:flex-1">
          <div className={CAIXA_DO_VIDEO}>
            {/* O iframe nasce aqui e nunca é destruído no fim: fica escondido. Nada fica por cima dele (política do YouTube). */}
            <div
              className={cn(
                "absolute inset-0 [&_iframe]:size-full",
                terminou && "hidden"
              )}
              ref={p.refVideo}
            />
            {terminou ? (
              <FimDoVideo
                aoRever={rever}
                assistida={p.estado.assistida}
                conquista={p.conquista}
                dados={dados}
              />
            ) : null}
          </div>
        </div>
        <div className="grid gap-2 px-4 pt-3 pb-3.5">
          <BarraDeTrechos
            aoBuscar={p.buscar}
            duracaoSeg={p.estado.duracaoSeg}
            tempoSeg={p.estado.tempoSeg}
            trechos={p.estado.trechos}
          />
          <ControlesDoPlayer
            aoMudarAtalhos={p.setAtalhosAbertos}
            atalhosAbertos={p.atalhosAbertos}
            avisoAparente={p.avisoAparente}
            comandar={comandar}
            conquista={p.conquista}
            estado={p.estado}
            podeTelaCheia={p.podeTelaCheia}
            portal={p.refContainer}
            telaCheia={p.telaCheia}
          />
          <ProblemaDoPlayer estado={p.estado} />
        </div>
      </section>
      {/* No fim, o cartão do vídeo já leva a Próxima aula em Sol: um botão principal por vez. */}
      <NavegacaoEntreAulas
        dados={dados}
        destacarProxima={p.estado.assistida && !terminou}
      />
    </div>
  );
}
