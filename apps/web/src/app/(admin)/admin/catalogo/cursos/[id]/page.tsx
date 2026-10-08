import { edicaoDeCursoNovo } from "@cursos/api/dominio/edicao-do-curso";
import type { CursoId } from "@cursos/api/dominio/tipos";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { EditorDoCurso } from "@/components/admin/editor-do-curso";
import { carregarCurso } from "@/server/api";

export const metadata: Metadata = { title: "Curso · Admin" };

const UUID = z.uuid();

/**
 * ?novo=1 é o rascunho que catalogo/cursos/novo abriu com este id. Sem ele, um id
 * que não existe é 404: a URL de um curso apagado não abre editor vazio.
 */
export default async function Curso({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ novo?: string }>;
}) {
  const { id } = await params;
  if (!UUID.safeParse(id).success) {
    notFound();
  }
  const salvo = await carregarCurso(id);
  const novo = (await searchParams).novo === "1";
  const edicao =
    salvo ?? (novo ? edicaoDeCursoNovo(id.toLowerCase() as CursoId) : null);
  if (!edicao) {
    notFound();
  }
  // A versão muda a cada salvamento: o refresh que vem depois remonta o editor
  // com o documento do banco, sem reconciliar o rascunho.
  return (
    <EditorDoCurso
      edicao={edicao}
      key={edicao.documento.versao ?? edicao.documento.id}
    />
  );
}
