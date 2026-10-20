import {
  EsqueletoDaBusca,
  EsqueletoDaSecao,
  EsqueletoDaTrilha,
} from "@/components/admin/esqueletos";
import { EsqueletoDoCabecalho } from "@/components/casca/cabecalho-da-pagina";

// A lista de Pessoas: a busca, os filtros por perfil e a seção das linhas. Os
// quatro perfis com a contagem somam 441 px; abaixo disso a trilha quebra em
// duas linhas, de 84 px.
export default function Carregando() {
  return (
    <div aria-busy="true" className="@container">
      <span className="sr-only">Carregando as pessoas</span>
      <EsqueletoDoCabecalho
        resumo="Quem tem conta, o perfil e o papel de cada um"
        titulo="Pessoas"
      />
      <EsqueletoDaBusca className="mb-4" />
      <EsqueletoDaTrilha className="mb-8 @min-[441px]:h-11 h-[84px] max-w-[441px] rounded-[22px]" />
      <EsqueletoDaSecao altura="h-[68px]" linhas={6} />
    </div>
  );
}
