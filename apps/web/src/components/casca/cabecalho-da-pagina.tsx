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

const LINHA_QUE_CARREGA =
  "animate-pulse rounded-lg bg-card text-transparent [box-decoration-break:clone]";

/**
 * O cabeçalho no loading.tsx: o mesmo título e o mesmo resumo do de cima, em
 * texto transparente sobre o pulso, para quebrar nas mesmas linhas em toda
 * largura; e, quando a página tem, o botão de 44 px. Na página cujo resumo
 * conta coisas, o resumo aqui é um exemplo do mesmo tamanho.
 */
export function EsqueletoDoCabecalho({
  acao = false,
  resumo,
  titulo,
}: {
  acao?: boolean;
  resumo: string;
  titulo: string;
}) {
  return (
    <div aria-hidden="true" className={CABECALHO}>
      <div className="grid min-w-0 gap-1.5">
        <p className="text-balance font-bold text-3xl tracking-tight">
          <span className={LINHA_QUE_CARREGA}>{titulo}</span>
        </p>
        <p className="max-w-[60ch] tabular-nums">
          <span className={LINHA_QUE_CARREGA}>{resumo}</span>
        </p>
      </div>
      {acao ? <Skeleton className="h-11 w-36 rounded-full bg-card" /> : null}
    </div>
  );
}
