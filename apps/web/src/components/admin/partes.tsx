import { badgeVariants } from "@cursos/ui/components/badge";
import { cn } from "@cursos/ui/lib/utils";
import type { ReactNode } from "react";

import { BOTAO_CONTORNO } from "@/components/casca/botoes";

export const CABECA = "h-11 px-5 font-semibold text-muted-foreground text-xs";
export const CELULA = "px-5 py-3.5 text-sm";
export const NUMERO = "text-right tabular-nums";

export const CAMPO =
  "rounded-[12px] border-muted-foreground bg-background px-3.5 text-sm md:text-sm dark:border-muted-foreground dark:bg-background";
export const SELECAO =
  "w-full *:data-[slot=native-select]:h-11 *:data-[slot=native-select]:rounded-[12px] *:data-[slot=native-select]:border-muted-foreground *:data-[slot=native-select]:bg-background *:data-[slot=native-select]:pl-3.5 *:data-[slot=native-select]:text-sm";
export const ROTULO = "font-semibold text-foreground text-sm";

export const AVISO =
  "flex gap-2.5 rounded-[14px] bg-sol/10 p-3.5 text-foreground text-sm ring-1 ring-sol/40";

/**
 * O focusableWhenDisabled do Base UI marca data-disabled, não disabled, e as
 * classes disabled: do Button não pegam. O botão do envio pendente fica com
 * opacidade cheia porque nada estiliza o data-disabled dele.
 */
const NAO_PODE = "data-disabled:cursor-not-allowed data-disabled:opacity-50";

export const ICONE = cn(
  "size-10 rounded-full bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground md:size-9",
  "focus-visible:outline-2 focus-visible:outline-ceu focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:ring-0",
  NAO_PODE,
  "data-disabled:hover:bg-transparent data-disabled:hover:text-muted-foreground"
);

/** O dark:hover:border-titulo do BOTAO_CONTORNO vence a classe sem variante. */
export const CONTORNO_DESLIGADO = cn(
  BOTAO_CONTORNO,
  NAO_PODE,
  "data-disabled:hover:border-muted-foreground dark:data-disabled:hover:border-muted-foreground"
);

/** Selo em pílula das tabelas do admin; a cor vem de quem chama. */
export const SELO = cn(
  badgeVariants({ variant: "secondary" }),
  "h-6 rounded-full px-2.5 font-semibold text-xs"
);

/** Seção do admin: título, resumo à direita e o conteúdo num cartão. */
export function Secao({
  children,
  descritoPor,
  id,
  resumo,
  titulo,
}: {
  children: ReactNode;
  descritoPor?: string;
  id: string;
  resumo: string;
  titulo: string;
}) {
  return (
    <section aria-labelledby={id} className="grid gap-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2
          aria-describedby={descritoPor}
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
