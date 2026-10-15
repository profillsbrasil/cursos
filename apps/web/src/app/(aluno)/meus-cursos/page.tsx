import { currentUser } from "@clerk/nextjs/server";
import type { Metadata } from "next";

import { BuscaEmBreve, TopoDoAluno } from "@/components/aluno/topo";
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
  const vazio = painel.cursos.length === 0;
  // A conta só aparece no estado vazio, para a pessoa conferir se entrou com a conta certa.
  const usuario = vazio ? await currentUser() : null;
  const conta =
    usuario?.primaryEmailAddress?.emailAddress ?? usuario?.fullName ?? null;
  return (
    <>
      <TopoDoAluno esquerda={<BuscaEmBreve />} />
      <ConteudoMeusCursos
        conta={conta}
        painel={painel}
        resumo={resumo}
        temCursoTrocavelNaVitrine={temCursoTrocavelNaVitrine}
      />
    </>
  );
}
