import { cn } from "@cursos/ui/lib/utils";

// A borda Céu do foco e do cursor vem do index.css pelo data-slot (#30); o campo
// não desenha anel nem contorno. O dark: repete as cores que o Input traz com dark:.
const MOLDURA =
  "border-muted-foreground bg-background px-3.5 text-sm md:text-sm dark:border-muted-foreground dark:bg-background";

// A altura mora aqui: nenhum uso passa classe de altura.
export const CAMPO = cn(MOLDURA, "h-11 rounded-full");

export const AREA = cn(
  MOLDURA,
  "min-h-0 rounded-[20px] py-[10.5px] leading-normal"
);
