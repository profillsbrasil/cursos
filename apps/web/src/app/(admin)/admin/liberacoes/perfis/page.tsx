import type { Metadata } from "next";

import { AbasDasLiberacoes } from "@/components/admin/abas-das-liberacoes";
import { GradeDosPerfisDoAdmin } from "@/components/admin/grade-dos-perfis";
import { CabecalhoDaPagina } from "@/components/casca/cabecalho-da-pagina";
import { carregarGradeDosPerfis } from "@/server/api";

export const metadata: Metadata = { title: "Liberações por perfil" };

export default async function LiberacoesPorPerfil() {
  const grade = await carregarGradeDosPerfis();
  return (
    <>
      <CabecalhoDaPagina
        resumo="Abra um curso a todo mundo de um perfil, inclusive a quem chegar depois"
        titulo="Liberações"
      />
      <AbasDasLiberacoes ativa="perfil" />
      <GradeDosPerfisDoAdmin grade={grade} />
    </>
  );
}
