import type { PainelMeusCursos, ResumoAluno } from "@cursos/api/dominio/painel";

import { CabecalhoDaPagina } from "@/components/casca/cabecalho-da-pagina";
import { plural } from "@/lib/formato";

import { AvisoComunicado, FaixaComunicado } from "./aviso-comunicado";
import { BannerContinuar } from "./banner-continuar";
import { CapaCurso, GRADE_CAPAS } from "./capa-curso";
import { PainelVazio } from "./painel-vazio";
import { Secao } from "./secao";
import { SuaSemana } from "./sua-semana";

const liberados = ({ cursos }: PainelMeusCursos) =>
  `${plural(cursos.length, "curso liberado", "cursos liberados")} para você`;

/** A página inteira a partir do painel e do resumo. A busca de dados fica na `page.tsx`. */
export function ConteudoMeusCursos({
  painel,
  resumo,
  temCursoTrocavelNaVitrine,
}: {
  painel: PainelMeusCursos;
  resumo: ResumoAluno;
  temCursoTrocavelNaVitrine: boolean;
}) {
  if (painel.cursos.length === 0) {
    return (
      <>
        <CabecalhoDaPagina resumo={null} titulo="Meus cursos" />
        <PainelVazio />
      </>
    );
  }

  const { comunicado } = painel;

  return (
    <>
      <CabecalhoDaPagina resumo={liberados(painel)} titulo="Meus cursos" />
      <div className="grid gap-10 max-[760px]:gap-8">
        <div className="grid items-stretch gap-5 min-[1181px]:grid-cols-[minmax(0,1fr)_320px]">
          <BannerContinuar retomada={painel.retomada} />
          {comunicado?.lugar === "topo" ? (
            <FaixaComunicado
              className="min-[1181px]:col-span-2 min-[1181px]:row-start-2"
              comunicado={comunicado}
            />
          ) : null}
          <SuaSemana
            resumo={resumo}
            temCursoTrocavelNaVitrine={temCursoTrocavelNaVitrine}
          />
        </div>
        <Secao id="cursos" titulo="Cursos">
          <div className={GRADE_CAPAS}>
            {painel.cursos.map((c) => (
              <CapaCurso curso={c} key={c.id} />
            ))}
          </div>
        </Secao>
        {comunicado?.lugar === "fim" ? (
          <AvisoComunicado comunicado={comunicado} />
        ) : null}
      </div>
    </>
  );
}
