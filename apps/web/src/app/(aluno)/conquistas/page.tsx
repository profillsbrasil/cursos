import type { Metadata } from "next";

import { BuscaEmBreve, TopoDoAluno } from "@/components/aluno/topo";
import { TelaDeConquistas } from "@/components/conquistas/tela-de-conquistas";
import { carregarConquistas } from "@/server/api";

export const metadata: Metadata = { title: "Conquistas" };

export default async function PaginaDeConquistas() {
  const conquistas = await carregarConquistas();
  return (
    <>
      <TopoDoAluno esquerda={<BuscaEmBreve />} />
      <TelaDeConquistas conquistas={conquistas} />
    </>
  );
}
