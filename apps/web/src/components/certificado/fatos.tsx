import { cn } from "@cursos/ui/lib/utils";

/**
 * Cada linha leva o recuo do cartão (`--pad`), que não tem padding lateral, então
 * a divisória vai de borda a borda.
 */
export function Fatos({
  className,
  fatos,
}: {
  className?: string;
  fatos: readonly (readonly [rotulo: string, valor: string])[];
}) {
  return (
    <dl className={cn("grid tabular-nums", className)}>
      {fatos.map(([rotulo, valor]) => (
        <div
          className="border-border flex justify-between gap-4 border-t px-(--pad) py-2.5"
          key={rotulo}
        >
          <dt className="text-muted-foreground">{rotulo}</dt>
          <dd className="text-foreground text-right font-semibold">{valor}</dd>
        </div>
      ))}
    </dl>
  );
}
