import type { AulaNaColuna, AulaNoPlayer } from "@cursos/api/dominio/aula";
import { cn } from "@cursos/ui/lib/utils";
import { Check } from "lucide-react";
import Link from "next/link";

import { BarraProgresso } from "@/components/meus-cursos/barra-progresso";
import { fmtMin, plural } from "@/lib/formato";
import { caminhoDaAula } from "@/lib/rotas";

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

/** A coluna da direita: progresso do curso e os módulos em sanfona, o atual aberto. */
export function ColunaDoCurso({ dados }: { dados: AulaNoPlayer }) {
  const { progresso, slug, titulo } = dados.curso;
  return (
    <aside
      aria-label="Aulas do curso"
      className="overflow-auto rounded-[20px] border border-border bg-sidebar min-[1081px]:sticky min-[1081px]:top-4 min-[1081px]:max-h-[calc(100vh-2rem)]"
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
          <summary className="grid cursor-pointer list-none grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-5 py-[13px] hover:bg-white/[0.03] focus-visible:outline-2 focus-visible:outline-ceu focus-visible:outline-solid focus-visible:-outline-offset-2 [&::-webkit-details-marker]:hidden">
            <span className="w-[26px] text-center font-mono text-muted-foreground text-xs tabular-nums">
              {m.numero}
            </span>
            <span className="font-semibold text-foreground text-sm group-open:text-titulo">
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
                    "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-2 text-foreground text-sm hover:bg-white/[0.04] focus-visible:outline-2 focus-visible:outline-ceu focus-visible:outline-solid focus-visible:-outline-offset-2",
                    a.atual && "bg-sol/[0.08] font-semibold text-titulo"
                  )}
                  href={caminhoDaAula(slug, a.id)}
                >
                  <Estado aula={a} numero={i + 1} />
                  <span>{a.titulo}</span>
                  <span className="font-mono text-muted-foreground text-xs tabular-nums">
                    {fmtMin(a.duracaoSeg)}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </details>
      ))}
    </aside>
  );
}
