import { Skeleton } from "@cursos/ui/components/skeleton";

/**
 * O topo de cada página do aluno: o título e, embaixo dele, o resumo. O resumo
 * fica colado no que resume, nunca na outra ponta da tela (DESIGN.md, Layout).
 * Resumo null é o do esqueleto, que ainda não tem o dado: a linha pulsa no lugar
 * dele, e o conteúdo não desce quando a página chega.
 */
export function CabecalhoDaPagina({
  resumo,
  titulo,
}: {
  resumo: string | null;
  titulo: string;
}) {
  return (
    <header className="mb-7 grid gap-1.5">
      <h1 className="text-balance font-bold text-3xl text-titulo tracking-tight">
        {titulo}
      </h1>
      {resumo === null ? (
        <Skeleton className="h-lh w-56 max-w-full rounded-md bg-card" />
      ) : (
        <p className="max-w-[60ch] text-muted-foreground tabular-nums">
          {resumo}
        </p>
      )}
    </header>
  );
}
