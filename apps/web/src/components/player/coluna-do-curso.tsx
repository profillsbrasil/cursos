"use client";

import type { AulaNaColuna, AulaNoPlayer } from "@cursos/api/dominio/aula";
import { cn } from "@cursos/ui/lib/utils";
import { Check, ListChecks } from "lucide-react";
import Link from "next/link";
import { useLayoutEffect, useRef } from "react";

import { BarraProgresso } from "@/components/meus-cursos/barra-progresso";
import { fmtMin, plural } from "@/lib/formato";
import {
  centrarAAulaAtual,
  rolagemDaColuna,
} from "@/lib/player/rolagem-da-coluna";
import { caminhoDaAula } from "@/lib/rotas";

/**
 * O script que segue a coluna no HTML do servidor: na carga direta (F5, link,
 * PWA reaberto) ela pinta já centrada, sem esperar o JS. O React não executa
 * script que ele mesmo insere, então na navegação no cliente quem centra é o
 * `useColunaNaAulaAtual`.
 */
const CENTRAR_NA_CARGA = `(${centrarAAulaAtual})(document.currentScript.previousElementSibling, ${rolagemDaColuna})`;

/**
 * No cliente o script vira bloco de dados: o React acusa no console todo
 * script de JS que ele cria, e esse nunca rodaria. Na hidratação o tipo
 * difere do HTML do servidor, que já executou.
 */
const TIPO_DO_SCRIPT = typeof window === "undefined" ? undefined : "text/plain";

/**
 * Centra a coluna na montagem pelo React e a cada aula nova. Na hidratação o
 * script do servidor já centrou, e a pessoa pode ter rolado a coluna antes de
 * o JS chegar: a montagem só centra a coluna que ainda está no topo. A página
 * nunca rola: no celular a coluna não tem rolagem própria.
 */
function useColunaNaAulaAtual(aulaId: string) {
  const coluna = useRef<HTMLElement>(null);
  const montada = useRef<boolean>(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: a aula nova é o gatilho; a medida vem do DOM.
  useLayoutEffect(() => {
    const el = coluna.current;
    if (el && (montada.current || el.scrollTop === 0)) {
      centrarAAulaAtual(el, rolagemDaColuna);
    }
    montada.current = true;
  }, [aulaId]);
  return coluna;
}

function Estado({ aula, numero }: { aula: AulaNaColuna; numero: number }) {
  if (aula.assistida) {
    return (
      <span className="grid size-[26px] shrink-0 place-items-center rounded-full bg-ceu text-sobre-cor">
        <Check aria-hidden="true" className="size-3.5" strokeWidth={2.6} />
        <span className="sr-only">Assistida.</span>
      </span>
    );
  }
  return (
    <span
      className={cn(
        "grid size-[26px] shrink-0 place-items-center rounded-full font-mono font-semibold text-xs tabular-nums",
        aula.atual
          ? "text-sol ring-2 ring-sol ring-inset"
          : "text-muted-foreground ring-[1.5px] ring-chart-5 ring-inset"
      )}
    >
      {numero}
    </span>
  );
}

/** A lista de checks antes da duração: Céu com o questionário aprovado, apagada com ele por fazer. */
function MarcaDoQuestionario({
  marca,
}: {
  marca: AulaNaColuna["questionario"];
}) {
  if (marca.tipo === "sem") {
    return null;
  }
  const aprovado = marca.tipo === "aprovado";
  return (
    <>
      <ListChecks
        aria-hidden="true"
        className={cn(
          "size-3.5",
          aprovado ? "text-ceu" : "text-muted-foreground"
        )}
      />
      <span className="sr-only">
        {aprovado ? "Questionário aprovado." : "Questionário a fazer."}
      </span>
    </>
  );
}

export function ColunaDoCurso({ dados }: { dados: AulaNoPlayer }) {
  const { progresso, slug, titulo } = dados.curso;
  const coluna = useColunaNaAulaAtual(dados.aula.id);
  return (
    <>
      <aside
        aria-label="Aulas do curso"
        className="overflow-auto rounded-[20px] border border-border bg-sidebar min-[1081px]:sticky min-[1081px]:top-4 min-[1081px]:max-h-[calc(100vh-2rem)]"
        ref={coluna}
      >
        <div className="grid gap-2.5 border-border border-b px-5 pt-[18px] pb-4">
          <h2 className="font-semibold text-base text-titulo">{titulo}</h2>
          <BarraProgresso
            pct={progresso.pct}
            rotulo={`Progresso no curso ${titulo}`}
          />
          <p className="text-[13px] text-muted-foreground tabular-nums">
            {progresso.feitas} de {plural(progresso.total, "aula", "aulas")} ·{" "}
            {progresso.pct}%
          </p>
        </div>
        {dados.modulos.map((m) => (
          <details
            className="group border-border border-b last:border-b-0"
            key={m.numero}
            open={m.atual}
          >
            {/* Sob o cursor e com o foco de teclado, fundo branco a 8% e título claro (#44). */}
            <summary className="group/modulo grid cursor-pointer list-none grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-5 py-[13px] hover:bg-white/8 [&::-webkit-details-marker]:hidden">
              <span className="w-[26px] text-center font-mono text-muted-foreground text-xs tabular-nums">
                {m.numero}
              </span>
              <span className="font-semibold text-foreground text-sm group-open:text-titulo group-hover/modulo:text-titulo">
                {m.titulo}
              </span>
              <span
                className={cn(
                  "font-mono text-xs tabular-nums",
                  m.feitas === m.aulas.length
                    ? "text-ceu"
                    : "text-muted-foreground"
                )}
              >
                {m.feitas}/{m.aulas.length}
                <span className="sr-only"> aulas assistidas</span>
              </span>
            </summary>
            <ol className="pb-2">
              {m.aulas.map((a, i) => (
                <li key={a.id}>
                  <Link
                    aria-current={a.atual ? "page" : undefined}
                    className={cn(
                      "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-2 text-foreground text-sm hover:bg-white/[0.04]",
                      a.atual && "bg-sol/[0.08] font-semibold text-titulo"
                    )}
                    href={caminhoDaAula(slug, a.id)}
                  >
                    <Estado aula={a} numero={i + 1} />
                    <span>{a.titulo}</span>
                    <span className="inline-flex items-center gap-1.5 font-mono text-muted-foreground text-xs tabular-nums">
                      <MarcaDoQuestionario marca={a.questionario} />
                      {fmtMin(a.duracaoSeg)}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </details>
        ))}
      </aside>
      {/* O texto sai do bundle de cada lado, e o tipo muda no cliente: a hidratação não confere os dois. */}
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: o texto é o código de centrarAAulaAtual, sem dado de fora.
        dangerouslySetInnerHTML={{ __html: CENTRAR_NA_CARGA }}
        suppressHydrationWarning
        type={TIPO_DO_SCRIPT}
      />
    </>
  );
}
