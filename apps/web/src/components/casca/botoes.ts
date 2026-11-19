import { buttonVariants } from "@cursos/ui/components/button";
import { cn } from "@cursos/ui/lib/utils";

const SEM_DESLOCAR =
  "transition-[color,background-color,border-color,box-shadow,opacity]";

/**
 * O foco de teclado acende o botão como o cursor: a variante hover: do globals.css
 * também casa com o foco (#30). Nenhum botão desenha contorno.
 */
export const BOTAO = cn(
  buttonVariants(),
  SEM_DESLOCAR,
  "hover:bg-sol-hover hover:shadow-brilho h-11 gap-2 rounded-full px-[18px] text-sm font-semibold"
);

/**
 * A outline traz dark:border-input, dark:bg-input/30 e dark:hover:bg-input/50, que vencem
 * as classes sem variante com .dark fixo no <html>: cada cor se repete com dark:.
 */
export const BOTAO_CONTORNO = cn(
  buttonVariants({ variant: "outline" }),
  SEM_DESLOCAR,
  "text-foreground h-11 gap-2 rounded-full px-[18px] text-sm font-semibold",
  "border-muted-foreground hover:border-titulo bg-transparent hover:bg-transparent",
  "dark:border-muted-foreground dark:hover:border-titulo dark:bg-transparent dark:hover:bg-transparent"
);

/**
 * A confirmação da ação que não se desfaz (apagar, excluir) fica no erro cheio, e não
 * no Sol: The Red Is Only Error Rule. A variante padrão não troca o texto sob o cursor.
 */
export const BOTAO_PERIGO = cn(
  buttonVariants(),
  "bg-destructive text-sobre-cor hover:bg-destructive/85 h-11 gap-2 rounded-full px-[18px] text-sm font-semibold"
);

export const PEQUENO = "h-9 px-3.5 text-[13px]";

/**
 * O focusableWhenDisabled do Base UI marca data-disabled, não disabled, e as
 * classes disabled: do Button não pegam. O botão do envio pendente fica com
 * opacidade cheia porque nada estiliza o data-disabled dele.
 *
 * O desligado segura o foco de teclado e neutraliza o próprio hover, então sobe de
 * 50% para 80% no foco e sob o cursor (#30): sem isso, ficaria sem sinal de foco.
 */
export const NAO_PODE =
  "data-disabled:cursor-not-allowed data-disabled:opacity-50 data-disabled:hover:opacity-80";

/** O dark:hover:border-titulo do BOTAO_CONTORNO vence a classe sem variante. */
export const CONTORNO_DESLIGADO = cn(
  BOTAO_CONTORNO,
  NAO_PODE,
  "data-disabled:hover:border-muted-foreground dark:data-disabled:hover:border-muted-foreground"
);

export const LINK_NO_TEXTO =
  "underline decoration-muted-foreground underline-offset-4 transition-colors hover:text-titulo hover:decoration-titulo";
