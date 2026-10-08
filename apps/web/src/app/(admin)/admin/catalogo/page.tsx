import type { Metadata } from "next";

import { VisaoDoCatalogo } from "@/components/admin/visao-do-catalogo";
import { carregarCatalogo } from "@/server/api";

export const metadata: Metadata = { title: "Catálogo · Admin" };

export default async function Catalogo() {
  const visao = await carregarCatalogo();
  return (
    <>
      <header className="mb-7 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1.5">
        <h1 className="font-bold text-3xl text-titulo tracking-tight">
          Catálogo
        </h1>
        <p className="text-muted-foreground">
          Trilhas e cursos que os alunos podem receber
        </p>
      </header>
      <VisaoDoCatalogo visao={visao} />
    </>
  );
}
