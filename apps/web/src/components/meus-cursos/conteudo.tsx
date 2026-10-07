import type { PainelMeusCursos, ResumoAluno } from "@cursos/api/dominio/painel";

import { plural } from "@/lib/formato";

import { BannerContinuar } from "./banner-continuar";
import { SuaSemana } from "./sua-semana";

// A página inteira a partir do painel e do resumo. A busca de dados fica na page.tsx.
export function ConteudoMeusCursos({
  painel,
  resumo,
}: {
  painel: PainelMeusCursos;
  resumo: ResumoAluno;
}) {
  return (
    <>
      <header className="mb-7 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1.5">
        <h1 className="font-bold text-3xl text-titulo tracking-tight">
          Meus cursos
        </h1>
        <p className="text-muted-foreground">
          {plural(painel.trilhas.length, "trilha", "trilhas")} e{" "}
          {plural(painel.soltos.length, "curso rápido", "cursos rápidos")}{" "}
          liberados para você
        </p>
      </header>
      <div className="grid gap-10 max-[760px]:gap-8">
        <div className="grid items-stretch gap-5 min-[1181px]:grid-cols-[minmax(0,1fr)_320px]">
          <BannerContinuar retomada={painel.retomada} />
          <SuaSemana resumo={resumo} />
        </div>
      </div>
    </>
  );
}
