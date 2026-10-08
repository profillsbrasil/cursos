import { badgeVariants } from "@cursos/ui/components/badge";
import { cn } from "@cursos/ui/lib/utils";
import type { ReactNode } from "react";

export const CABECA = "h-11 px-5 font-semibold text-muted-foreground text-xs";
export const CELULA = "px-5 py-3.5 text-sm";
export const NUMERO = "text-right tabular-nums";

/** Campo de texto e seleção dos formulários do admin. */
export const CAMPO =
  "rounded-[12px] border-muted-foreground bg-background px-3.5 text-sm md:text-sm dark:border-muted-foreground dark:bg-background";
export const SELECAO =
  "w-full *:data-[slot=native-select]:h-11 *:data-[slot=native-select]:rounded-[12px] *:data-[slot=native-select]:border-muted-foreground *:data-[slot=native-select]:bg-background *:data-[slot=native-select]:pl-3.5 *:data-[slot=native-select]:text-sm";
export const ROTULO = "font-semibold text-foreground text-sm";

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
  resumo: string;
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
        <p className="text-muted-foreground text-sm tabular-nums">{resumo}</p>
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
