import {
  EsqueletoDaBusca,
  EsqueletoDaSecao,
  EsqueletoDaTrilha,
} from "@/components/admin/esqueletos";
import { EsqueletoDoCabecalho } from "@/components/casca/cabecalho-da-pagina";

// A lista de Pessoas: a busca, os filtros por perfil e a seção das linhas.
export default function Carregando() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Carregando as pessoas</span>
      <EsqueletoDoCabecalho />
      <EsqueletoDaBusca className="mb-4" />
      <EsqueletoDaTrilha className="mb-8 max-w-[30rem]" />
      <EsqueletoDaSecao altura="h-[68px]" linhas={6} />
    </div>
  );
}
