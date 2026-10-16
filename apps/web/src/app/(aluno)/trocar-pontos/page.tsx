import type { Metadata } from "next";

import { BuscaEmBreve, TopoDoAluno } from "@/components/aluno/topo";
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
      <TopoDoAluno esquerda={<BuscaEmBreve />} />
      <header className="mb-7 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1.5">
        <h1 className="font-bold text-3xl text-titulo tracking-tight">
          Trocar pontos
        </h1>
        <p className="text-muted-foreground">
          Troque seus pontos por cursos liberados para sempre
        </p>
      </header>
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
