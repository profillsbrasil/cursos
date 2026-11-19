import { cn } from "@cursos/ui/lib/utils";

/**
 * Div server, sem JS: o trilho leva contorno muted-foreground porque o trilho
 * sobre o card dá 1,5:1, e a barra precisa de 3:1 (WCAG 1.4.11).
 */
export function BarraProgresso({
  className,
  pct,
  rotulo,
}: {
  className?: string;
  pct: number;
  rotulo: string;
}) {
  return (
    <div
      aria-label={rotulo}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={pct}
      className={cn(
        "bg-trilho ring-muted-foreground h-2 overflow-hidden rounded-full ring-1 ring-inset",
        className
      )}
      role="progressbar"
    >
      <div
        className="bg-sol h-full rounded-full"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
