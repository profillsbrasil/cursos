import type { Metadata } from "next";

import { abasDasLiberacoes } from "@/components/admin/abas-das-liberacoes";
import { BarraDaLista } from "@/components/admin/barra-da-lista";
import { GradeDosPerfisDoAdmin } from "@/components/admin/grade-dos-perfis";
import { ORDEM_DOS_PERFIS } from "@/components/admin/pessoas/perfis";
import { CabecalhoDaPagina } from "@/components/casca/cabecalho-da-pagina";
import { fmtNum, plural } from "@/lib/formato";
import { carregarGradeDosPerfis } from "@/server/api";

export const metadata: Metadata = { title: "Liberações por perfil" };

export default async function LiberacoesPorPerfil() {
  const grade = await carregarGradeDosPerfis();
  const abertos = grade.cursos.filter((c) =>
    ORDEM_DOS_PERFIS.every((p) => c.liberacoes[p] !== null)
  ).length;
  return (
    <>
      <CabecalhoDaPagina
        resumo="Abra um curso a todo mundo de um perfil, inclusive a quem chegar depois"
        titulo="Liberações"
      />
      <BarraDaLista
        contagem={`${plural(grade.cursos.length, "curso", "cursos")}, ${fmtNum(abertos)} liberados a todos`}
        opcoes={abasDasLiberacoes("perfil")}
        rotuloDasOpcoes="Liberar por"
      />
      <GradeDosPerfisDoAdmin grade={grade} />
    </>
  );
}
