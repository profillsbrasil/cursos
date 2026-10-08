import type { Metadata } from "next";

import { Comunicados } from "@/components/admin/comunicados";
import { carregarComunicados } from "@/server/api";

export const metadata: Metadata = { title: "Comunicados · Admin" };

export default async function PaginaDeComunicados() {
  const dados = await carregarComunicados();
  return (
    <>
      <header className="mb-7 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1.5">
        <h1 className="font-bold text-3xl text-titulo tracking-tight">
          Comunicados
        </h1>
        <p className="text-muted-foreground">
          O aluno vê em Meus cursos só o mais recente que alcança
        </p>
      </header>
      <Comunicados {...dados} />
    </>
  );
}
