import { badgeVariants } from "@cursos/ui/components/badge";
import { cn } from "@cursos/ui/lib/utils";
import type { ReactNode } from "react";

export const CABECA = "h-11 px-5 font-semibold text-muted-foreground text-xs";
export const CELULA = "px-5 py-3.5 text-sm";
export const NUMERO = "text-right tabular-nums";

/** Selo em pílula das tabelas do admin; a cor vem de quem chama. */
export const SELO = cn(
  badgeVariants({ variant: "secondary" }),
  "h-6 rounded-full px-2.5 font-semibold text-xs"
);

/** Seção do admin: título, resumo à direita e o conteúdo num cartão. */
export function Secao({
  children,
  id,
  resumo,
  titulo,
}: {
  children: ReactNode;
  id: string;
  resumo?: string;
  titulo: string;
}) {
  return (
    <section aria-labelledby={id} className="grid gap-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2
          className="font-bold text-titulo text-xl tracking-tight focus:outline-none"
          id={id}
          tabIndex={-1}
        >
          {titulo}
        </h2>
        {resumo ? (
          <p className="text-muted-foreground text-sm tabular-nums">{resumo}</p>
        ) : null}
      </div>
      <div className="overflow-hidden rounded-[20px] bg-card ring-1 ring-border">
        {children}
      </div>
    </section>
  );
}

export function Vazio({ children }: { children: ReactNode }) {
  return <p className="px-5 py-4 text-muted-foreground">{children}</p>;
}
