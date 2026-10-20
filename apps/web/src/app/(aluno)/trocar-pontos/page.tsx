import type { Metadata } from "next";

import { acaoDaRetomada } from "@/components/aluno/continuar";
import { CabecalhoDaTroca } from "@/components/trocar-pontos/cabecalho-da-troca";
import { CursosParaTrocar } from "@/components/trocar-pontos/cursos-para-trocar";
import { SaldoDeTroca } from "@/components/trocar-pontos/saldo-de-troca";
import { carregarPainel, carregarPainelDeTroca } from "@/server/api";

export const metadata: Metadata = { title: "Trocar pontos" };

export default async function TrocarPontos() {
  const [painel, { retomada }] = await Promise.all([
    carregarPainelDeTroca(),
    carregarPainel(),
  ]);
  return (
    <>
      <CabecalhoDaTroca />
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
          retomar={acaoDaRetomada(retomada)}
          temCursoTrocavelNaVitrine={painel.temCursoTrocavelNaVitrine}
        />
      </div>
    </>
  );
}
