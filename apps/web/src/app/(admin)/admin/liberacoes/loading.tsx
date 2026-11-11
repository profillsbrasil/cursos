import { Skeleton } from "@cursos/ui/components/skeleton";

import {
  EsqueletoDaBarra,
  EsqueletoDoCartao,
} from "@/components/admin/esqueletos";
import { EsqueletoDoCabecalho } from "@/components/casca/cabecalho-da-pagina";

// A aba Por pessoa: a barra com as abas, a contagem e a busca, e depois a
// lista e a coluna Marcadas, na grade da TelaDeAlunos, com a coluna antes da
// lista no container estreito. As duas abas somam 181 px.
export default function Carregando() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Carregando as liberações</span>
      <EsqueletoDoCabecalho
        resumo="Marque pessoas para liberar um curso, ou abra uma para ver o acesso"
        titulo="Liberações"
      />
      <EsqueletoDaBarra busca contagem="50 pessoas" trilha="w-[181px]" />
      <div className="@container">
        <div className="grid @min-[47.5rem]:grid-cols-[minmax(0,1fr)_20rem] items-start gap-7">
          <EsqueletoDoCartao altura="h-[88px]" linhas={5} />
          <Skeleton className="@min-[47.5rem]:order-none order-first h-[300px] rounded-[20px] bg-card" />
        </div>
      </div>
    </div>
  );
}
