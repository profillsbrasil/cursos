import type { Metadata } from "next";

import { TelaDeComunicados } from "@/components/comunicados-do-aluno/tela-de-comunicados";
import { carregarComunicadosDoAluno } from "@/server/api";

export const metadata: Metadata = { title: "Comunicados" };

export default async function PaginaDeComunicados() {
  const comunicados = await carregarComunicadosDoAluno();
  return <TelaDeComunicados comunicados={comunicados} />;
}
