import {
  EsqueletoDaBarra,
  EsqueletoDoCartao,
} from "@/components/admin/esqueletos";
import { EsqueletoDoCabecalho } from "@/components/casca/cabecalho-da-pagina";

// A lista de Pessoas: o cabeçalho com o botão Convidar, a barra com os filtros
// por perfil e a opção Convidados, a contagem e a busca, e o cartão das linhas.
// As cinco opções com a contagem somam 512 px; abaixo disso a trilha quebra em
// duas linhas, de 84 px.
export default function Carregando() {
  return (
    <div aria-busy="true" className="@container">
      <span className="sr-only">Carregando as pessoas</span>
      <EsqueletoDoCabecalho
        acao
        resumo="Quem tem conta, o perfil e o papel de cada um"
        titulo="Pessoas"
      />
      <EsqueletoDaBarra
        busca
        contagem="120 pessoas"
        trilha="@min-[512px]:h-11 h-[84px] w-[512px]"
      />
      <EsqueletoDoCartao altura="h-[68px]" linhas={6} />
    </div>
  );
}
