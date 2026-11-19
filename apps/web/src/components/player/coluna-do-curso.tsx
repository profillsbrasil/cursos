"use client";

import type { AulaNaColuna, AulaNoPlayer } from "@cursos/api/dominio/aula";
import { cn } from "@cursos/ui/lib/utils";
import { Check, ListChecks, Lock } from "lucide-react";
import Link from "next/link";
import { useLayoutEffect, useRef } from "react";

import { BarraProgresso } from "@/components/meus-cursos/barra-progresso";
import { fmtMin, plural } from "@/lib/formato";
import {
  centrarAAulaAtual,
  rolagemDaColuna,
} from "@/lib/player/rolagem-da-coluna";
import { caminhoDaAula, caminhoDoCurso } from "@/lib/rotas";

// WARNING: o React não executa script que ele mesmo insere; na navegação no cliente quem centra é useColunaNaAulaAtual.
const CENTRAR_NA_CARGA = `(${centrarAAulaAtual.toString()})(document.currentScript.previousElementSibling, ${rolagemDaColuna.toString()})`;

const TIPO_DO_SCRIPT = typeof window === "undefined" ? undefined : "text/plain";

function useColunaNaAulaAtual(aulaId: string) {
  const coluna = useRef<HTMLElement>(null);
  const montada = useRef<boolean>(false);
  // oxlint-disable react/exhaustive-effect-dependencies -- a aula nova é o gatilho; a medida vem do DOM.
  useLayoutEffect(() => {
    const el = coluna.current;

    if (el && (montada.current || el.scrollTop === 0)) {
      centrarAAulaAtual(el, rolagemDaColuna);
    }

    montada.current = true;
  }, [aulaId]);

  // oxlint-enable react/exhaustive-effect-dependencies
  return coluna;
}

function Estado({ aula, numero }: { aula: AulaNaColuna; numero: number }) {
  if (aula.assistida) {
    return (
      <span className="bg-ceu text-sobre-cor grid size-[26px] shrink-0 place-items-center rounded-full">
        <Check aria-hidden="true" className="size-3.5" strokeWidth={2.6} />
        <span className="sr-only">Assistida.</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "grid size-[26px] shrink-0 place-items-center rounded-full font-mono text-xs font-semibold tabular-nums",
        aula.atual
          ? "text-sol ring-sol ring-2 ring-inset"
          : "text-muted-foreground ring-chart-5 ring-[1.5px] ring-inset"
      )}
    >
      {numero}
    </span>
  );
}

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
  const amostra = dados.amostra !== null;
  const coluna = useColunaNaAulaAtual(dados.aula.id);

  return (
    <>
      <aside
        aria-label="Aulas do curso"
        className="border-border bg-sidebar overflow-auto rounded-[20px] border min-[1081px]:sticky min-[1081px]:top-4 min-[1081px]:max-h-[calc(100vh-2rem)]"
        ref={coluna}
      >
        <div className="border-border grid gap-2.5 border-b px-5 pt-[18px] pb-4">
          <h2 className="text-titulo text-base font-semibold">
            <Link
              className="decoration-muted-foreground hover:decoration-titulo underline underline-offset-4"
              href={caminhoDoCurso(slug)}
            >
              {titulo}
            </Link>
          </h2>
          <BarraProgresso
            pct={progresso.pct}
            rotulo={`Progresso no curso ${titulo}`}
          />
          <p className="text-muted-foreground text-[13px] tabular-nums">
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
            <summary className="group/modulo grid cursor-pointer list-none grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-5 py-[13px] transition-colors duration-150 hover:bg-white/8 [&::-webkit-details-marker]:hidden">
              <span className="text-muted-foreground w-[26px] text-center font-mono text-xs tabular-nums">
                {m.numero}
              </span>
              <span className="text-foreground group-open:text-titulo group-hover/modulo:text-titulo font-semibold">
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
                  {amostra && !a.atual ? (
                    <span className="text-muted-foreground grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-2">
                      <span className="grid size-[26px] shrink-0 place-items-center">
                        <Lock aria-hidden="true" className="size-4" />
                        <span className="sr-only">
                          Fechada. Troque para assistir.
                        </span>
                      </span>
                      <span>{a.titulo}</span>
                      <span className="font-mono text-xs tabular-nums">
                        {fmtMin(a.duracaoSeg)}
                      </span>
                    </span>
                  ) : (
                    <Link
                      aria-current={a.atual ? "page" : undefined}
                      className={cn(
                        "text-foreground hover:text-titulo grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-2 hover:bg-white/8",
                        a.atual && "bg-sol/[0.08] text-titulo font-semibold"
                      )}
                      href={caminhoDaAula(slug, a.id)}
                    >
                      <Estado aula={a} numero={i + 1} />
                      <span>{a.titulo}</span>
                      <span className="text-muted-foreground inline-flex items-center gap-1.5 font-mono text-xs tabular-nums">
                        <MarcaDoQuestionario marca={a.questionario} />
                        {fmtMin(a.duracaoSeg)}
                      </span>
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </details>
        ))}
      </aside>
      <script
        // oxlint-disable-next-line react/no-danger -- o texto é o código de centrarAAulaAtual, sem dado de fora.
        dangerouslySetInnerHTML={{ __html: CENTRAR_NA_CARGA }}
        // WARNING: o texto sai do bundle de cada lado e o tipo muda no cliente; a hidratação não confere os dois.
        suppressHydrationWarning
        type={TIPO_DO_SCRIPT}
      />
    </>
  );
}
