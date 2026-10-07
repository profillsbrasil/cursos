import type { Metadata } from "next";

import { ConteudoMeusCursos } from "@/components/meus-cursos/conteudo";
import { carregarPainel, carregarResumo } from "@/server/api";

export const metadata: Metadata = { title: "Meus cursos · Profills School" };

export default async function MeusCursos() {
  const [painel, resumo] = await Promise.all([
    carregarPainel(),
    carregarResumo(),
  ]);
  return <ConteudoMeusCursos painel={painel} resumo={resumo} />;
}
