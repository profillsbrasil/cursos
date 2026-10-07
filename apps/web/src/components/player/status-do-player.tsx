import type { Conquista } from "@cursos/api/dominio/registro";
import { Check } from "lucide-react";

import { plural } from "@/lib/formato";
import type { EstadoEnvio } from "@/lib/player/sessao";

export function StatusDoPlayer({
  conquista,
  envio,
}: {
  conquista: Conquista | null;
  envio: EstadoEnvio;
}) {
  return (
    // `contents`: vazia, a região não ocupa linha nem gap no grid do pai, mas
    // segue na árvore de acessibilidade, e o texto que entra depois é anunciado.
    <div className="contents" role="status">
      {conquista ? (
        <div className="fade-in slide-in-from-bottom-1 flex animate-in items-center gap-3 rounded-[14px] border border-chart-5 bg-card px-3.5 py-2.5 duration-500 motion-reduce:animate-none">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ceu text-sobre-cor">
            <Check aria-hidden="true" className="size-4" strokeWidth={2.4} />
          </span>
          <span className="min-w-0 flex-1">
            <b className="block text-sm text-titulo">Aula assistida</b>
            <small className="text-[13px] text-muted-foreground">
              Você viu 90% dos trechos desta aula.
              {conquista.bonusSequencia
                ? ` Sequência de ${plural(conquista.sequenciaDias, "dia útil", "dias úteis")}: +${conquista.bonusSequencia} pts.`
                : null}
            </small>
          </span>
          <span className="shrink-0 font-mono font-semibold text-base text-sol tabular-nums">
            +{conquista.pontos} pts
          </span>
        </div>
      ) : null}
      {envio.tipo === "esperando_nova_tentativa" ||
      (envio.tipo === "enviando" && envio.tentativa > 0) ? (
        <p className="text-[13px] text-muted-foreground">
          Progresso não salvo. Tentando de novo.
        </p>
      ) : null}
    </div>
  );
}
