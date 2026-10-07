import { buttonVariants } from "@cursos/ui/components/button";
import { cn } from "@cursos/ui/lib/utils";

// A base do buttonVariants pinta borda e anel no foco; o protótipo pede só o contorno céu.
const FOCO =
  "focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-ceu focus-visible:outline-solid focus-visible:outline-offset-3";

export const BOTAO = cn(
  buttonVariants(),
  "h-11 gap-2 rounded-full px-[18px] font-semibold text-sm hover:bg-[#ffd633] hover:shadow-[0_6px_18px_rgb(255_204_1/0.28)] focus-visible:border-transparent",
  FOCO
);

// A outline traz dark:border-input, dark:bg-input/30 e dark:hover:bg-input/50, que vencem
// as classes sem variante com .dark fixo no <html>: cada cor se repete com dark:.
export const BOTAO_CONTORNO = cn(
  buttonVariants({ variant: "outline" }),
  "h-11 gap-2 rounded-full px-[18px] font-semibold text-foreground text-sm",
  "border-muted-foreground bg-transparent hover:border-titulo hover:bg-transparent",
  "dark:border-muted-foreground dark:bg-transparent dark:hover:border-titulo dark:hover:bg-transparent",
  "focus-visible:border-muted-foreground dark:focus-visible:border-muted-foreground",
  FOCO
);
