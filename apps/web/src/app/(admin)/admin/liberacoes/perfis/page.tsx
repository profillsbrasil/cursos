import type { Metadata } from "next";

import { AbasDasLiberacoes } from "@/components/admin/abas-das-liberacoes";
import { GradeDosPerfisDoAdmin } from "@/components/admin/grade-dos-perfis";
import { carregarGradeDosPerfis } from "@/server/api";

export const metadata: Metadata = { title: "Liberações por perfil" };

export default async function LiberacoesPorPerfil() {
  const grade = await carregarGradeDosPerfis();
  return (
    <>
      <header className="mb-7 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1.5">
        <h1 className="font-bold text-3xl text-titulo tracking-tight">
          Liberações
        </h1>
        <p className="text-muted-foreground">
          Abra um curso a todo mundo de um perfil, inclusive a quem chegar
          depois
        </p>
      </header>
      <AbasDasLiberacoes ativa="perfil" />
      <GradeDosPerfisDoAdmin grade={grade} />
    </>
  );
}
