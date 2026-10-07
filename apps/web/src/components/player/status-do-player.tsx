import type { Conquista } from "@cursos/api/dominio/registro";
import { cn } from "@cursos/ui/lib/utils";
import { Check } from "lucide-react";
import type { ReactNode } from "react";

import { plural } from "@/lib/formato";
import type { EstadoEnvio } from "@/lib/player/sessao";

const PILHA = "grid items-center *:col-start-1 *:row-start-1";
const ENTRADA =
  "transition-[translate,opacity,visibility] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none";

/**
 * A linha de atalhos, o aviso da conquista e a falha de envio dividem a mesma célula
 * do grid: o aviso aparece no lugar dos atalhos, dentro do card, sem empurrar o
 * cabeçalho da aula e sem tocar no iframe.
 */
export function StatusDoPlayer({
  atalhos,
  avisoAparente,
  conquista,
  envio,
}: {
  atalhos: ReactNode;
  avisoAparente: boolean;
  conquista: Conquista | null;
  envio: EstadoEnvio;
}) {
  const falhando =
    envio.tipo === "esperando_nova_tentativa" ||
    (envio.tipo === "enviando" && envio.falhasSeguidas > 0);
  const aviso = conquista !== null && avisoAparente;
  return (
    <div className={cn(PILHA, "min-[861px]:min-h-[38px]")}>
      <div
        className={cn(
          "transition-opacity duration-300 motion-reduce:transition-none",
          (aviso || falhando) && "invisible opacity-0"
        )}
      >
        {atalhos}
      </div>
      <div className={PILHA} role="status">
        {conquista ? (
          <div
            className={cn(
              ENTRADA,
              "flex items-center gap-2.5 rounded-[12px] border border-chart-5 bg-card px-3 py-1.5",
              aviso ? "opacity-100" : "invisible translate-y-4 opacity-0"
            )}
          >
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ceu text-sobre-cor">
              <Check
                aria-hidden="true"
                className="size-3.5"
                strokeWidth={2.6}
              />
            </span>
            <p className="min-w-0 flex-1 text-[13px] text-muted-foreground">
              <b className="font-semibold text-titulo">Aula assistida.</b> Você
              viu 90% dos trechos desta aula.
              {conquista.bonusSequencia
                ? ` Sequência de ${plural(conquista.sequenciaDias, "dia útil", "dias úteis")}: +${conquista.bonusSequencia} pts.`
                : null}
            </p>
            <span className="shrink-0 font-mono font-semibold text-base text-sol tabular-nums">
              +{conquista.pontos} pts
            </span>
          </div>
        ) : null}
        {falhando ? (
          <p
            className={cn(
              "text-[13px] text-muted-foreground",
              aviso && "invisible"
            )}
          >
            Progresso não salvo. Tentando de novo.
          </p>
        ) : null}
      </div>
    </div>
  );
}
