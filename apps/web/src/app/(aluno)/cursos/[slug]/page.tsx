import { diaLocal } from "@cursos/api/dominio/sequencia";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BuscaEmBreve, TopoDoAluno } from "@/components/aluno/topo";
import { TelaDoCurso } from "@/components/curso/tela-do-curso";
import { carregarPaginaDoCurso } from "@/server/api";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const pagina = await carregarPaginaDoCurso((await params).slug);
  return { title: pagina?.titulo ?? "Curso" };
}

export default async function Curso({ params }: Props) {
  const pagina = await carregarPaginaDoCurso((await params).slug);
  if (!pagina) {
    notFound();
  }
  return (
    <>
      <TopoDoAluno esquerda={<BuscaEmBreve />} />
      <TelaDoCurso hoje={diaLocal(new Date())} pagina={pagina} />
    </>
  );
}
