import type { Metadata } from "next";

import { BuscaEmBreve, TopoDoAluno } from "@/components/aluno/topo";
import { TelaDeComunicados } from "@/components/comunicados-do-aluno/tela-de-comunicados";
import { carregarComunicadosDoAluno } from "@/server/api";

export const metadata: Metadata = { title: "Comunicados" };

export default async function PaginaDeComunicados() {
  const comunicados = await carregarComunicadosDoAluno();
  return (
    <>
      <TopoDoAluno esquerda={<BuscaEmBreve />} />
      <TelaDeComunicados comunicados={comunicados} />
    </>
  );
}
