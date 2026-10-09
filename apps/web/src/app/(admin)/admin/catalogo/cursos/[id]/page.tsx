import { edicaoDeCursoNovo } from "@cursos/api/dominio/edicao-do-curso";
import type { CursoId } from "@cursos/api/dominio/tipos";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EditorDoCurso } from "@/components/admin/editor-do-curso";
import { abrirOuRascunho } from "@/lib/abrir-ou-rascunho";
import { carregarCurso } from "@/server/api";

export const metadata: Metadata = { title: "Curso · Admin" };

export default async function Curso({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ novo?: string | string[] }>;
}) {
  const [{ id }, { novo }] = await Promise.all([params, searchParams]);
  const edicao = await abrirOuRascunho(
    { id, novo },
    {
      carregar: carregarCurso,
      rascunho: (minusculo) => edicaoDeCursoNovo(minusculo as CursoId),
    }
  );
  if (!edicao) {
    notFound();
  }
  return <EditorDoCurso edicao={edicao} key={edicao.documento.id} />;
}
