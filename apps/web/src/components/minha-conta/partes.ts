import { cn } from "@cursos/ui/lib/utils";

import {
  BOTAO,
  BOTAO_CONTORNO,
  BOTAO_PERIGO,
  PEQUENO,
} from "@/components/casca/botoes";

/**
 * O cartão não tem padding lateral: o cabeçalho, cada linha e o pé têm o próprio,
 * e a divisória é o `border-t` da linha, então vai de borda a borda.
 */
export const CARTAO =
  "min-w-0 overflow-hidden rounded-[20px] bg-card ring-1 ring-border";

export const CABECALHO_DO_CARTAO = "grid gap-0.5 px-[22px] pt-5 pb-3.5";

/** O pé do cartão, com a ação dele ou o formulário que ela abre. */
export const PE_DO_CARTAO =
  "grid gap-3 border-border border-t px-[22px] py-3.5";

export const TITULO_DA_SECAO =
  "font-semibold text-lg text-titulo leading-[1.3]";

export const RESUMO_DA_SECAO = "max-w-[60ch] text-[13px] text-muted-foreground";

/** Uma linha do cartão, separada da de cima por 1 px de ponta a ponta. */
export const LINHA =
  "flex min-w-0 items-center gap-3.5 border-border border-t px-[22px] py-3.5";

/** A linha que é um botão inteiro, como "Mais 4 acessos antigos". */
export const LINHA_BOTAO = cn(
  LINHA,
  "w-full cursor-pointer list-none justify-between font-semibold text-[13px] text-ceu transition-colors duration-150 ease-forte hover:bg-white/4 hover:text-titulo [&::-webkit-details-marker]:hidden"
);

export const TEXTO_DA_LINHA = "grid min-w-0 flex-1 gap-0.5";

export const NOME_DA_LINHA =
  "block break-words font-semibold text-sm text-titulo";

export const DETALHE_DA_LINHA =
  "break-words text-[12.5px] text-muted-foreground";

export const SELO =
  "inline-flex h-6 shrink-0 items-center rounded-full px-2.5 font-semibold text-xs";

/** A ação em texto da linha (Sair, Remover), em Céu, que clareia sob o cursor e no foco. */
export const ACAO_NA_LINHA =
  "shrink-0 cursor-pointer font-semibold text-[13px] text-ceu transition-colors duration-150 ease-forte hover:text-titulo disabled:cursor-not-allowed disabled:opacity-50";

export const BOTAO_PEQUENO = cn(BOTAO, PEQUENO);

export const CONTORNO_PEQUENO = cn(BOTAO_CONTORNO, PEQUENO);

// A outline troca o texto por foreground sob o cursor e com o foco: o perigo repete o erro.
export const PERIGO = cn(
  CONTORNO_PEQUENO,
  "border-destructive text-destructive hover:border-destructive hover:bg-destructive/10 hover:text-destructive",
  "dark:border-destructive dark:hover:border-destructive dark:hover:bg-destructive/10 dark:hover:text-destructive"
);

export const EXCLUIR = cn(BOTAO_PERIGO, PEQUENO);

export const ACOES = "flex flex-wrap items-center gap-2";

export const ROTULO = "font-semibold text-[13px] text-titulo";

export const AJUDA = "text-muted-foreground text-xs";

/** A caixa de marcar em Sol, como a da busca de alunos do admin. */
export const CAIXA =
  "size-5 rounded-[7px] border-[1.5px] border-muted-foreground bg-background transition-colors dark:bg-background aria-checked:border-sol aria-checked:text-sobre-cor dark:aria-checked:bg-sol dark:aria-checked:hover:bg-sol-hover [&_svg]:size-3.5 [&_svg]:stroke-[3.2]";

export const ICONE_DO_APARELHO =
  "grid size-[34px] shrink-0 place-items-center rounded-[10px] bg-sidebar-accent text-muted-foreground [&_svg]:size-[18px]";
