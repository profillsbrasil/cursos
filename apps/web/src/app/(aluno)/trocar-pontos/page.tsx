import type { Metadata } from "next";

import { BuscaEmBreve, Chips, TopoDoAluno } from "@/components/aluno/topo";
import { CursosParaTrocar } from "@/components/trocar-pontos/cursos-para-trocar";
import { SaldoDeTroca } from "@/components/trocar-pontos/saldo-de-troca";
import { carregarPainelDeTroca, carregarResumo } from "@/server/api";

export const metadata: Metadata = { title: "Trocar pontos · Profills School" };

export default async function TrocarPontos() {
  const [painel, resumo] = await Promise.all([
    carregarPainelDeTroca(),
    carregarResumo(),
  ]);
  return (
    <>
      <TopoDoAluno
        chips={<Chips resumo={resumo} />}
        esquerda={<BuscaEmBreve />}
      />
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
        />
        <CursosParaTrocar
          cartoes={painel.cartoes}
          extrato={painel.extrato}
          hoje={painel.hoje}
        />
      </div>
    </>
  );
}
