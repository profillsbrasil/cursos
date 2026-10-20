import { badgeVariants } from "@cursos/ui/components/badge";
import { cn } from "@cursos/ui/lib/utils";

/**
 * O selo em pílula de 24 px, 600 em 12 px. O Badge fixa o ícone em 12 px
 * (`size-3!`), então quem chama não passa tamanho ao ícone; a cor vem de quem chama.
 */
export const SELO = cn(
  badgeVariants({ variant: "secondary" }),
  "h-6 gap-1.5 rounded-full px-2.5 font-semibold text-xs transition-colors"
);
