import { cn } from "@cursos/ui/lib/utils";

// A borda Céu do foco e do cursor vem do index.css pelo data-slot (#30); o campo
// não desenha anel nem contorno. O dark: repete as cores que o Input traz com dark:.
const MOLDURA =
  "border-muted-foreground bg-background px-3.5 text-sm md:text-sm dark:border-muted-foreground dark:bg-background";

export const CAMPO = cn(MOLDURA, "rounded-[12px]");

export const AREA = cn(MOLDURA, "min-h-0 rounded-[12px] py-2.5 leading-normal");
