import { cn } from "@cursos/ui/lib/utils";
import type { ReactNode } from "react";

import { NAO_PODE } from "@/components/casca/botoes";
import { CARTAO } from "@/components/casca/cartoes";

/**
 * O gatilho da Selecao. A borda Céu do foco e do cursor vem do index.css pelo
 * data-slot="select-trigger"; a seta gira com o data-popup-open do Base UI.
 */
export const SELECAO =
  "flex h-11 w-full min-w-0 cursor-pointer select-none items-center justify-between gap-2 rounded-full border border-muted-foreground bg-background px-3.5 text-left text-foreground transition-colors aria-invalid:border-destructive data-disabled:cursor-not-allowed data-disabled:opacity-50 data-placeholder:text-muted-foreground [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted-foreground [&>svg]:transition-[rotate] [&>svg]:duration-200 [&>svg]:ease-forte data-popup-open:[&>svg]:rotate-180 motion-reduce:[&>svg]:transition-none";

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

/**
 * O filtro de escolha única do admin (os perfis de Pessoas, os status do
 * Catálogo, as abas de Liberações e o status do editor): a trilha em pílula
 * e as opções de 36 px. A ligada é `titulo` com texto `sobre-cor`, pelo
 * aria-pressed do botão ou pelo aria-current do link; a outra ganha `popover`
 * sob o cursor e com o foco. Com 44 px de altura, o raio de 22 px é a pílula
 * cheia, e a trilha que quebra em duas linhas vira um retângulo arredondado.
 */
export const TRILHA =
  "m-0 flex w-fit min-w-0 max-w-full flex-wrap gap-1 rounded-[22px] border-0 bg-card p-1 ring-1 ring-border ring-inset";

export const OPCAO_DA_TRILHA =
  "group/opcao inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3.5 font-semibold text-[13px] text-foreground transition-colors hover:bg-popover hover:text-titulo aria-pressed:bg-titulo aria-pressed:text-sobre-cor aria-pressed:hover:bg-foreground aria-pressed:hover:text-sobre-cor aria-[current=page]:bg-titulo aria-[current=page]:text-sobre-cor aria-[current=page]:hover:bg-foreground aria-[current=page]:hover:text-sobre-cor [&_svg]:size-[13px]";

/** A contagem ao lado do rótulo da opção, apagada na solta e na ligada. */
export const CONTAGEM_DA_OPCAO =
  "font-medium text-muted-foreground tabular-nums group-aria-pressed/opcao:text-sobre-cor/70 group-aria-[current=page]/opcao:text-sobre-cor/70";

export const AVISO =
  "flex gap-2.5 rounded-[14px] bg-sol/10 p-3.5 text-foreground text-sm ring-1 ring-sol/40";

export const ICONE = cn(
  "size-10 rounded-full bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground md:size-9",
  NAO_PODE,
  "data-disabled:hover:bg-transparent data-disabled:hover:text-muted-foreground"
);

/** O cartão do conteúdo de uma Secao. */
export const CARTAO_DA_SECAO = cn(CARTAO, "overflow-hidden");

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
        <p className="text-muted-foreground tabular-nums">{resumo}</p>
      </div>
      <div className={CARTAO_DA_SECAO}>{children}</div>
    </section>
  );
}

export function Vazio({ children }: { children: ReactNode }) {
  return <p className="px-5 py-4 text-muted-foreground">{children}</p>;
}
