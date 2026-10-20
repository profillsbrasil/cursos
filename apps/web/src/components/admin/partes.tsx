import { badgeVariants } from "@cursos/ui/components/badge";
import { cn } from "@cursos/ui/lib/utils";
import type { ReactNode } from "react";

import { NAO_PODE } from "@/components/casca/botoes";

/**
 * O gatilho da Selecao. A borda Céu do foco e do cursor vem do index.css pelo
 * data-slot="select-trigger"; a seta gira com o data-popup-open do Base UI.
 */
export const SELECAO =
  "flex h-11 w-full min-w-0 cursor-pointer select-none items-center justify-between gap-2 rounded-full border border-muted-foreground bg-background px-3.5 text-left text-foreground text-sm transition-colors aria-invalid:border-destructive data-disabled:cursor-not-allowed data-disabled:opacity-50 data-placeholder:text-muted-foreground [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted-foreground [&>svg]:transition-[rotate] [&>svg]:duration-200 [&>svg]:ease-forte data-popup-open:[&>svg]:rotate-180 motion-reduce:[&>svg]:transition-none";

export const GATILHO_DA_SELECAO = {
  campo: SELECAO,
  pilula: cn(SELECAO, "h-10 w-36 rounded-full text-[13px] md:h-9"),
} as const;

/**
 * A lista aberta, no padrão do menu da conta. Abre em 150 ms pela opacidade e
 * pelo transform inteiro; com movimento reduzido, só a opacidade anima, sem
 * deslocar.
 */
export const LISTA_DA_SELECAO =
  "max-h-[min(20rem,var(--available-height))] min-w-(--anchor-width) max-w-[min(26rem,var(--available-width))] origin-(--transform-origin) overflow-y-auto rounded-[14px] bg-popover p-1.5 text-popover-foreground shadow-black/45 shadow-xl ring-1 ring-border transition-[opacity,transform] duration-150 ease-forte data-ending-style:opacity-0 data-starting-style:opacity-0 data-ending-style:duration-100 data-ending-style:[transform:translateY(-4px)_scale(0.98)] data-starting-style:[transform:translateY(-4px)_scale(0.98)] motion-reduce:transition-opacity motion-reduce:data-ending-style:transform-none motion-reduce:data-starting-style:transform-none";

export const ITEM_DA_SELECAO =
  "flex min-h-9 cursor-pointer select-none items-center gap-2.5 rounded-[9px] px-2.5 py-1.5 font-medium text-[13px] text-sidebar-foreground data-highlighted:bg-sidebar-accent data-selected:font-semibold data-highlighted:text-titulo data-selected:text-titulo [&_svg]:size-4 [&_svg]:shrink-0";

/** "Criar categoria" no fim da lista: Céu 600, também com o realce. */
export const OPCAO_DE_CRIAR =
  "font-semibold text-ceu data-highlighted:text-ceu [&_svg]:text-ceu";

export const PE_DA_SELECAO =
  "flex shrink-0 items-center justify-between gap-3 border-border border-t px-3.5 py-2 text-muted-foreground text-xs";

export const GRUPO_DA_SELECAO =
  "px-2.5 pt-2.5 pb-1 font-semibold text-muted-foreground text-xs";

export const SEM_OPCAO_DA_SELECAO =
  "px-2.5 py-2 text-[13px] text-muted-foreground";

export const DIVISOR_DA_SELECAO = "-mx-1.5 my-1.5 h-px bg-border";

export const BUSCA_DA_SELECAO =
  "flex h-[38px] shrink-0 items-center gap-2 border-border border-b px-3.5 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted-foreground";

export const ROTULO = "font-semibold text-foreground text-sm";

export const AVISO =
  "flex gap-2.5 rounded-[14px] bg-sol/10 p-3.5 text-foreground text-sm ring-1 ring-sol/40";

export const ICONE = cn(
  "size-10 rounded-full bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground md:size-9",
  NAO_PODE,
  "data-disabled:hover:bg-transparent data-disabled:hover:text-muted-foreground"
);

/** Selo em pílula das tabelas do admin; a cor vem de quem chama. */
export const SELO = cn(
  badgeVariants({ variant: "secondary" }),
  "h-6 rounded-full px-2.5 font-semibold text-xs transition-colors"
);

/** O cartão do conteúdo de uma Secao. */
export const CARTAO_DA_SECAO =
  "overflow-hidden rounded-[20px] bg-card ring-1 ring-border";

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
          className="font-bold text-2xl text-titulo tracking-tight"
          id={id}
          tabIndex={-1}
        >
          {titulo}
        </h2>
        <p className="text-muted-foreground text-sm tabular-nums">{resumo}</p>
      </div>
      <div className={CARTAO_DA_SECAO}>{children}</div>
    </section>
  );
}

export function Vazio({ children }: { children: ReactNode }) {
  return <p className="px-5 py-4 text-muted-foreground text-sm">{children}</p>;
}
