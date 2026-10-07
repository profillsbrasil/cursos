import { currentUser } from "@clerk/nextjs/server";
import type { Metadata } from "next";

import { BuscaEmBreve, Chips, TopoDoAluno } from "@/components/aluno/topo";
import { ConteudoMeusCursos } from "@/components/meus-cursos/conteudo";
import { carregarPainel, carregarResumo } from "@/server/api";

export const metadata: Metadata = { title: "Meus cursos · Profills School" };

export default async function MeusCursos() {
  const [painel, resumo] = await Promise.all([
    carregarPainel(),
    carregarResumo(),
  ]);
  const vazio = painel.trilhas.length === 0 && painel.soltos.length === 0;
  // A conta só aparece no estado vazio, para a pessoa conferir se entrou com a conta certa.
  const usuario = vazio ? await currentUser() : null;
  const conta =
    usuario?.primaryEmailAddress?.emailAddress ?? usuario?.fullName ?? null;
  return (
    <>
      <TopoDoAluno
        chips={<Chips resumo={resumo} />}
        esquerda={<BuscaEmBreve />}
      />
      <ConteudoMeusCursos conta={conta} painel={painel} resumo={resumo} />
    </>
  );
}
