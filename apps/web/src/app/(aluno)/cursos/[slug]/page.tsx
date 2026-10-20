import { diaLocal } from "@cursos/api/dominio/sequencia";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TelaDoCurso } from "@/components/curso/tela-do-curso";
import { carregarPaginaDoCurso } from "@/server/api";

interface Props {
  params: Promise<{ slug: string }>;
}

// O notFound() aqui também: só assim o Next troca o título pelo do not-found.tsx.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const pagina = await carregarPaginaDoCurso((await params).slug);
  if (!pagina) {
    notFound();
  }
  return { title: pagina.titulo };
}

export default async function Curso({ params }: Props) {
  const pagina = await carregarPaginaDoCurso((await params).slug);
  if (!pagina) {
    notFound();
  }
  return <TelaDoCurso hoje={diaLocal(new Date())} pagina={pagina} />;
}
