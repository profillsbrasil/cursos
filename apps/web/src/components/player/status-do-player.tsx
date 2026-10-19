import type { Conquista } from "@cursos/api/dominio/registro";
import { Tooltip, TooltipTrigger } from "@cursos/ui/components/tooltip";
import { cn } from "@cursos/ui/lib/utils";

import { plural } from "@/lib/formato";

import { DicaDoPlayer } from "./dica-do-player";

const PILHA = "grid items-center *:col-start-1 *:row-start-1";
const ENTRADA =
  "transition-[translate,opacity,visibility] duration-200 ease-forte motion-reduce:transition-[opacity,visibility]";

/**
 * O "% visto" e o aviso da conquista dividem a mesma célula da barra de controles: o
 * aviso aparece no lugar do "% visto" sem empurrar os botões, porque a célula já tem a
 * largura do maior dos dois, e sem tocar no iframe.
 */
export function StatusDoPlayer({
  avisoAparente,
  conquista,
  pct,
}: {
  avisoAparente: boolean;
  conquista: Conquista | null;
  pct: number;
}) {
  const aviso = conquista !== null && avisoAparente;
  return (
    <div className={cn(PILHA, "mr-1.5")}>
      <Tooltip>
        <TooltipTrigger
          render={
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-1.5 py-1 text-[13px] text-muted-foreground transition-[background-color,opacity,visibility] duration-150 ease-forte hover:bg-accent",
                aviso && "invisible opacity-0"
              )}
              // biome-ignore lint/a11y/noNoninteractiveTabindex: a dica que explica a faixa abre pelo foco de teclado.
              tabIndex={0}
            />
          }
        >
          <i aria-hidden="true" className="size-2.5 rounded-[3px] bg-sol" />
          <span>
            <b className="font-semibold text-foreground tabular-nums">{pct}%</b>{" "}
            visto
            <span className="sr-only"> dos trechos desta aula</span>
          </span>
        </TooltipTrigger>
        <DicaDoPlayer className="max-w-[260px]">
          A faixa amarela é o que você já viu. Na marca azul (90%) a aula conta
          como assistida.
        </DicaDoPlayer>
      </Tooltip>
      <div className={PILHA} role="status">
        {conquista ? (
          <p
            className={cn(
              ENTRADA,
              "inline-flex items-center gap-2 px-1.5 text-[13px] text-titulo",
              aviso
                ? "opacity-100"
                : "invisible translate-y-2 opacity-0 motion-reduce:translate-y-0"
            )}
          >
            <b className="font-mono font-semibold text-base text-sol tabular-nums">
              +{conquista.pontos} pts
            </b>
            <span>
              aula assistida
              {conquista.bonusSequencia
                ? `. Sequência de ${plural(conquista.sequenciaDias, "dia útil", "dias úteis")}: +${conquista.bonusSequencia} pts`
                : null}
            </span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
