import type { Metadata } from "next";

import { CabecalhoDaPagina } from "@/components/aluno/cabecalho-da-pagina";
import { CursosParaTrocar } from "@/components/trocar-pontos/cursos-para-trocar";
import { SaldoDeTroca } from "@/components/trocar-pontos/saldo-de-troca";
import { hrefDaRetomada } from "@/lib/rotas";
import { carregarPainel, carregarPainelDeTroca } from "@/server/api";

export const metadata: Metadata = { title: "Trocar pontos" };

export default async function TrocarPontos() {
  const [painel, { retomada }] = await Promise.all([
    carregarPainelDeTroca(),
    carregarPainel(),
  ]);
  return (
    <>
      <CabecalhoDaPagina
        resumo="Troque seus pontos por cursos liberados para sempre."
        titulo="Trocar pontos"
      />
      <div className="grid gap-10">
        <SaldoDeTroca
          comoGanhar={painel.comoGanhar}
          pontosSemana={painel.pontosSemana}
          saldo={painel.saldo}
          temCursoTrocavelNaVitrine={painel.temCursoTrocavelNaVitrine}
        />
        <CursosParaTrocar
          cartoes={painel.cartoes}
          extrato={painel.extrato}
          hoje={painel.hoje}
          temCursoTrocavelNaVitrine={painel.temCursoTrocavelNaVitrine}
          voltarAEstudar={retomada ? hrefDaRetomada(retomada) : "/meus-cursos"}
        />
      </div>
    </>
  );
}
