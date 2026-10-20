import { Skeleton } from "@cursos/ui/components/skeleton";

import {
  EsqueletoDaBusca,
  EsqueletoDaSecao,
  EsqueletoDaTrilha,
} from "@/components/admin/esqueletos";
import { EsqueletoDoCabecalho } from "@/components/casca/cabecalho-da-pagina";

// A aba Por pessoa: as abas, a busca, a lista e a coluna Marcadas, na grade da
// TelaDeAlunos, com a coluna antes da lista no container estreito.
export default function Carregando() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Carregando as liberações</span>
      <EsqueletoDoCabecalho
        resumo="Marque pessoas para liberar um curso, ou abra uma para ver o acesso"
        titulo="Liberações"
      />
      <EsqueletoDaTrilha className="mb-7 max-w-[13.5rem]" />
      <EsqueletoDaBusca className="mb-8" />
      <div className="@container">
        <div className="grid @min-[47.5rem]:grid-cols-[minmax(0,1fr)_20rem] items-start gap-7">
          <EsqueletoDaSecao altura="h-[88px]" linhas={5} />
          <Skeleton className="@min-[47.5rem]:order-none order-first h-[300px] rounded-[20px] bg-card" />
        </div>
      </div>
    </div>
  );
}
