import type { Conquista } from "@cursos/api/dominio/registro";
import { Tooltip, TooltipTrigger } from "@cursos/ui/components/tooltip";
import { cn } from "@cursos/ui/lib/utils";

import { plural } from "@/lib/formato";

import { DicaDoPlayer } from "./dica-do-player";

const ENTRADA =
  "transition-[translate,opacity,visibility] duration-200 ease-forte motion-reduce:transition-[opacity,visibility]";

/**
 * O "% visto" e o aviso da conquista dividem a mesma célula da barra de controles, o
 * vão entre o tempo e os botões da direita. O "% visto" fica encostado à direita e dá
 * a largura mínima da célula; o aviso cobre a célula inteira por cima, alinhado à
 * direita e quebrando em até duas linhas, então nem a largura dele nem a chegada dele
 * mexem na barra. Na barra de 320 px o vão não basta, e o aviso cobre também o tempo.
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
    <div className="@max-[18.5rem]/barra:static relative flex min-w-0 flex-1 items-center justify-end self-stretch">
      <Tooltip>
        <TooltipTrigger
          render={
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-1.5 py-1 text-[13px] text-muted-foreground transition-[background-color,opacity,visibility] duration-150 ease-forte hover:bg-accent",
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
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-end"
        role="status"
      >
        {conquista ? (
          <p
            className={cn(
              ENTRADA,
              "line-clamp-2 @max-[18.5rem]/barra:w-full @max-[18.5rem]/barra:bg-background px-1.5 text-right text-[13px] text-titulo leading-[1.3]",
              aviso
                ? "opacity-100"
                : "invisible translate-y-2 opacity-0 motion-reduce:translate-y-0"
            )}
          >
            <b className="mr-2 font-mono font-semibold text-base text-sol tabular-nums leading-none">
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
