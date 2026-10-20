import { Skeleton } from "@cursos/ui/components/skeleton";
import type { ReactNode } from "react";

const CABECALHO =
  "mb-7 flex flex-wrap items-end justify-between gap-x-5 gap-y-3.5";

/**
 * O topo das páginas do aluno e do admin: o título e, 6 px abaixo, o resumo,
 * colado no que resume e nunca na outra ponta da linha (DESIGN.md, Title
 * page). A ação, quando há, fica à direita do par e desce abaixo dele quando a
 * linha não cabe. O conteúdo começa 28 px abaixo.
 */
export function CabecalhoDaPagina({
  acao,
  resumo,
  titulo,
}: {
  acao?: ReactNode;
  resumo: ReactNode;
  titulo: string;
}) {
  return (
    <header className={CABECALHO}>
      <div className="grid min-w-0 gap-1.5">
        <h1 className="text-balance font-bold text-3xl text-titulo tracking-tight">
          {titulo}
        </h1>
        {resumo ? (
          <p className="max-w-[60ch] text-muted-foreground tabular-nums">
            {resumo}
          </p>
        ) : null}
      </div>
      {acao}
    </header>
  );
}

/**
 * O cabeçalho no loading.tsx, na geometria do de cima: o título de 36 px, o
 * resumo de 24 px a 6 px dele e, quando a página tem, o botão de 44 px.
 */
export function EsqueletoDoCabecalho({
  acao = false,
  resumo = true,
}: {
  acao?: boolean;
  resumo?: boolean;
}) {
  return (
    <div className={CABECALHO}>
      <div className="grid gap-1.5">
        <Skeleton className="h-9 w-44 rounded-lg bg-card" />
        {resumo ? (
          <Skeleton className="h-6 w-[min(22rem,80vw)] rounded-lg bg-card" />
        ) : null}
      </div>
      {acao ? <Skeleton className="h-11 w-36 rounded-full bg-card" /> : null}
    </div>
  );
}
