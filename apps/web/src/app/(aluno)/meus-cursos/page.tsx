import type { Metadata } from "next";

import { ConteudoMeusCursos } from "@/components/meus-cursos/conteudo";
import {
  carregarPainel,
  carregarResumo,
  carregarTemCursoTrocavelNaVitrine,
} from "@/server/api";

export const metadata: Metadata = { title: "Meus cursos" };

export default async function MeusCursos() {
  const [painel, resumo, temCursoTrocavelNaVitrine] = await Promise.all([
    carregarPainel(),
    carregarResumo(),
    carregarTemCursoTrocavelNaVitrine(),
  ]);
  return (
    <ConteudoMeusCursos
      painel={painel}
      resumo={resumo}
      temCursoTrocavelNaVitrine={temCursoTrocavelNaVitrine}
    />
  );
}
