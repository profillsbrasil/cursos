import { buttonVariants } from "@cursos/ui/components/button";
import { cn } from "@cursos/ui/lib/utils";

// O foco de teclado acende o botão como o cursor: a variante hover: do globals.css
// também casa com o foco (#30). Nenhum botão desenha contorno.
export const BOTAO = cn(
  buttonVariants(),
  "h-11 gap-2 rounded-full px-[18px] font-semibold text-sm hover:bg-sol-hover hover:shadow-brilho"
);

// A outline traz dark:border-input, dark:bg-input/30 e dark:hover:bg-input/50, que vencem
// as classes sem variante com .dark fixo no <html>: cada cor se repete com dark:.
export const BOTAO_CONTORNO = cn(
  buttonVariants({ variant: "outline" }),
  "h-11 gap-2 rounded-full px-[18px] font-semibold text-foreground text-sm",
  "border-muted-foreground bg-transparent hover:border-titulo hover:bg-transparent",
  "dark:border-muted-foreground dark:bg-transparent dark:hover:border-titulo dark:hover:bg-transparent"
);

export const PEQUENO = "h-9 px-3.5 text-[13px]";

export const LINK_NO_TEXTO =
  "underline decoration-muted-foreground underline-offset-4 transition-colors hover:text-titulo hover:decoration-titulo";
