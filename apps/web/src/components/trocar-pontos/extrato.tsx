import type { ItemDoExtrato } from "@cursos/api/dominio/pontos";
import { cn } from "@cursos/ui/lib/utils";

import { fmtPtsComSinal, quando } from "@/lib/formato";

export function Extrato({
  lancamentoNovoId,
  hoje,
  itens,
}: {
  lancamentoNovoId: string | null;
  hoje: string;
  itens: readonly ItemDoExtrato[];
}) {
  if (itens.length === 0) {
    return (
      <p className="rounded-[20px] bg-card px-5 py-4 text-muted-foreground ring-1 ring-border">
        Nenhum ponto ainda. Cada aula assistida até o fim vale pontos.
      </p>
    );
  }
  return (
    <ul className="overflow-hidden rounded-[20px] bg-card ring-1 ring-border">
      {itens.map((item) => {
        const novo = item.id === lancamentoNovoId;
        return (
          <li
            className={cn(
              "grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3.5 px-5 py-3.5 [&+&]:border-border [&+&]:border-t",
              "max-[520px]:grid-cols-[minmax(0,1fr)_auto] max-[520px]:gap-x-3 max-[520px]:gap-y-0.5 max-[520px]:px-4 max-[520px]:py-3",
              novo && "bg-ceu/8"
            )}
            key={item.id}
          >
            <span
              className={cn(
                "text-[13px] max-[520px]:col-span-full",
                novo ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {quando(item.dia, hoje)}
            </span>
            <span>{item.texto}</span>
            <span
              className={cn(
                "whitespace-nowrap font-bold tabular-nums",
                item.pontos < 0 ? "text-foreground" : "text-sol"
              )}
            >
              {fmtPtsComSinal(item.pontos)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
