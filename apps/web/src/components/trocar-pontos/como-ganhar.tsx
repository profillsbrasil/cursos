import type { RegraDeGanho } from "@cursos/api/dominio/pontos";
import { cn } from "@cursos/ui/lib/utils";

import { fmtPts } from "@/lib/formato";

/** Tabela de pontos, dentro do cartão do saldo. A divisória de cima vai de borda a borda. */
export function ComoGanhar({
  aberta,
  id,
  regras,
}: {
  aberta: boolean;
  id: string;
  regras: readonly RegraDeGanho[];
}) {
  return (
    <div
      className="relative -mx-(--pad) mt-6 border-border border-t px-(--pad) pt-5"
      hidden={!aberta}
      id={id}
    >
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-x-8 gap-y-1">
        {regras.map((r) => (
          <li
            className="flex items-baseline justify-between gap-4 border-border border-b border-dashed py-2.5"
            key={r.rotulo}
          >
            <span>
              {r.rotulo}
              {r.emBreve ? (
                <>
                  {" "}
                  <span className="ml-1 whitespace-nowrap font-normal text-muted-foreground text-xs">
                    Em breve
                  </span>
                </>
              ) : null}
            </span>
            <b
              className={cn(
                "whitespace-nowrap font-bold tabular-nums",
                r.emBreve ? "text-muted-foreground" : "text-sol"
              )}
            >
              +{fmtPts(r.pontos)}
            </b>
          </li>
        ))}
      </ul>
      <p className="mt-3.5 text-muted-foreground text-sm">
        Rever aula ou refazer prova não pontua de novo. Sábado e domingo nunca
        quebram a sequência.
      </p>
    </div>
  );
}
