import {
  EsqueletoDaBarra,
  EsqueletoDoCartao,
} from "@/components/admin/esqueletos";
import { EsqueletoDoCabecalho } from "@/components/casca/cabecalho-da-pagina";

// A lista de Pessoas: a barra com os filtros por perfil, a contagem e a busca,
// e o cartão das linhas. Os quatro perfis com a contagem somam 441 px; abaixo
// disso a trilha quebra em duas linhas, de 84 px.
export default function Carregando() {
  return (
    <div aria-busy="true" className="@container">
      <span className="sr-only">Carregando as pessoas</span>
      <EsqueletoDoCabecalho
        resumo="Quem tem conta, o perfil e o papel de cada um"
        titulo="Pessoas"
      />
      <EsqueletoDaBarra
        busca
        contagem="120 pessoas"
        trilha="@min-[441px]:h-11 h-[84px] w-[441px]"
      />
      <EsqueletoDoCartao altura="h-[68px]" linhas={6} />
    </div>
  );
}
