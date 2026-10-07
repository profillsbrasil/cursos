"use client";

import type { AulaNoPlayer } from "@cursos/api/dominio/aula";
import type { VideoDaAula } from "@cursos/api/dominio/tipos";
import { Kbd } from "@cursos/ui/components/kbd";

import type { EstadoDaSessao } from "@/lib/player/sessao";
import { usePlayerDaAula } from "@/lib/player/use-player-da-aula";

import { AvisoAulaAssistida } from "./aviso-aula-assistida";
import { BarraDeTrechos } from "./barra-de-trechos";
import { CabecalhoDaAula } from "./cabecalho-da-aula";
import { ControlesDoPlayer } from "./controles-do-player";

const TECLA =
  "h-auto min-w-0 rounded-[4px] border border-chart-5 border-b-2 bg-transparent px-1 font-mono text-[11px] text-foreground";

const NAO_SALVOU = {
  sem_acesso:
    "Não deu para salvar seu progresso: este curso não está mais liberado para você.",
  sem_video:
    "Não deu para salvar seu progresso: o vídeo desta aula saiu do ar.",
  sessao_expirada:
    "Não deu para salvar seu progresso: sua sessão expirou. Entre de novo para continuar contando.",
} as const;

const INDISPONIVEL = {
  nao_encontrado: "Este vídeo não foi encontrado no YouTube.",
  outro: "O vídeo não carregou. Recarregue a página para tentar de novo.",
  sem_permissao_de_incorporar:
    "O dono do vídeo não permite tocar o vídeo fora do YouTube.",
} as const;

function Problema({ estado }: { estado: EstadoDaSessao }) {
  let texto: string | null = null;
  if (estado.reproducao.tipo === "indisponivel") {
    texto = INDISPONIVEL[estado.reproducao.motivo];
  } else if (estado.envio.tipo === "parado") {
    texto = NAO_SALVOU[estado.envio.motivo];
  }
  return texto ? (
    <p className="text-[13px] text-destructive" role="alert">
      {texto}
    </p>
  ) : null;
}

/** O player só sabe da sessão: YouTube, trechos e envio ficam atrás do hook. */
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
  return (
    <div className="grid min-w-0 gap-5">
      <section
        aria-label="Player da aula"
        className="overflow-hidden rounded-[20px] border border-border bg-background outline-none [&:fullscreen]:flex [&:fullscreen]:flex-col [&:fullscreen]:rounded-none [&:fullscreen]:border-0"
        ref={p.refContainer}
        tabIndex={-1}
      >
        {/* O iframe nasce aqui. Nada fica por cima dele (política do YouTube). */}
        <div
          className="aspect-video min-h-[200px] w-full bg-black [&_iframe]:size-full [:fullscreen_&]:aspect-auto [:fullscreen_&]:flex-1"
          ref={p.refVideo}
        />
        <div className="grid gap-2 px-4 pt-3 pb-3.5">
          <BarraDeTrechos
            aoBuscar={p.buscar}
            duracaoSeg={p.estado.duracaoSeg}
            tempoSeg={p.estado.tempoSeg}
            trechos={p.estado.trechos}
          />
          <ControlesDoPlayer
            comandar={p.comandar}
            estado={p.estado}
            podeTelaCheia={p.podeTelaCheia}
            telaCheia={p.telaCheia}
          />
          <Problema estado={p.estado} />
          <p className="text-muted-foreground text-xs max-[860px]:hidden">
            <Kbd className={TECLA}>espaço</Kbd> reproduz ·{" "}
            <Kbd className={TECLA}>←</Kbd> <Kbd className={TECLA}>→</Kbd> 5 s ·{" "}
            <Kbd className={TECLA}>j</Kbd> <Kbd className={TECLA}>l</Kbd> 10 s ·{" "}
            <Kbd className={TECLA}>↑</Kbd> <Kbd className={TECLA}>↓</Kbd> volume
            · <Kbd className={TECLA}>f</Kbd> tela cheia · a amarela mostra o que
            você já viu, a marca azul é 90%
          </p>
        </div>
      </section>
      <CabecalhoDaAula dados={dados} destacarProxima={p.estado.assistida} />
      <AvisoAulaAssistida conquista={p.conquista} />
    </div>
  );
}
