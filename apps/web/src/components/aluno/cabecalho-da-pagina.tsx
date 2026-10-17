import type { ReactNode } from "react";

/**
 * O topo de cada página do aluno: o título e, embaixo dele, o resumo. O resumo
 * fica colado no que resume, nunca na outra ponta da tela (DESIGN.md, Layout).
 */
export function CabecalhoDaPagina({
  resumo,
  titulo,
}: {
  resumo: ReactNode;
  titulo: string;
}) {
  return (
    <header className="mb-7 grid gap-1.5">
      <h1 className="text-balance font-bold text-3xl text-titulo tracking-tight">
        {titulo}
      </h1>
      {resumo ? (
        <p className="max-w-[60ch] text-muted-foreground tabular-nums">
          {resumo}
        </p>
      ) : null}
    </header>
  );
}
