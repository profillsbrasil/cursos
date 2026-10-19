import { cn } from "@cursos/ui/lib/utils";

import { BOTAO, BOTAO_CONTORNO, PEQUENO } from "@/components/casca/botoes";

export const SECAO =
  "grid min-w-0 gap-4 rounded-[20px] bg-card p-[22px] ring-1 ring-border";

export const TITULO_DA_SECAO =
  "font-semibold text-lg text-titulo leading-[1.3]";

export const RESUMO_DA_SECAO =
  "mt-0.5 max-w-[60ch] text-[13px] text-muted-foreground";

/** Uma linha de lista dentro da seção, separada da de cima por 1 px. */
export const LINHA =
  "flex min-w-0 items-center gap-3 border-border border-t py-3 first:border-t-0 first:pt-0";

export const TEXTO_DA_LINHA = "grid min-w-0 flex-1 gap-0.5";

export const NOME_DA_LINHA =
  "break-words font-semibold text-[13.5px] text-titulo";

export const DETALHE_DA_LINHA = "text-[12.5px] text-muted-foreground";

export const SELO =
  "inline-flex h-6 shrink-0 items-center rounded-full px-2.5 font-semibold text-xs";

/** A ação em texto da linha (Sair, Remover), em Céu, que clareia sob o cursor e no foco. */
export const ACAO_NA_LINHA =
  "shrink-0 cursor-pointer font-semibold text-[13px] text-ceu transition-colors duration-150 ease-forte hover:text-titulo disabled:cursor-not-allowed disabled:opacity-50";

export const BOTAO_PEQUENO = cn(BOTAO, PEQUENO);

export const CONTORNO_PEQUENO = cn(BOTAO_CONTORNO, PEQUENO);

export const ACOES = "flex flex-wrap items-center gap-2";

export const ROTULO = "font-semibold text-[13px] text-titulo";

export const AJUDA = "text-muted-foreground text-xs";

export const AVISO =
  "rounded-[14px] bg-sol/10 p-3.5 text-[13px] text-foreground ring-1 ring-sol/40";

/** A caixa de marcar em Sol, como a da busca de alunos do admin. */
export const CAIXA =
  "size-5 rounded-[7px] border-[1.5px] border-muted-foreground bg-background transition-colors dark:bg-background aria-checked:border-sol aria-checked:text-sobre-cor dark:aria-checked:bg-sol dark:aria-checked:hover:bg-sol-hover [&_svg]:size-3.5 [&_svg]:stroke-[3.2]";

export const ICONE_DO_APARELHO =
  "grid size-[34px] shrink-0 place-items-center rounded-[10px] bg-sidebar-accent text-muted-foreground [&_svg]:size-[18px]";
