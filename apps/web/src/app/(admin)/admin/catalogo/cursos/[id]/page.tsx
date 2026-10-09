import { edicaoDeCursoNovo } from "@cursos/api/dominio/edicao-do-curso";
import type { CursoId } from "@cursos/api/dominio/tipos";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EditorDoCurso } from "@/components/admin/editor-do-curso";
import { abrirOuRascunho } from "@/lib/abrir-ou-rascunho";
import { carregarCurso } from "@/server/api";

export const metadata: Metadata = { title: "Curso · Admin" };

/**
 * ?novo=1 é o rascunho que catalogo/cursos/novo abriu com este id. Sem ele, um id
 * que não existe é 404: a URL de um curso apagado não abre editor vazio.
 */
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
  // A versão muda a cada salvamento: o refresh que vem depois remonta o editor
  // com o documento do banco, sem reconciliar o rascunho.
  return (
    <EditorDoCurso
      edicao={edicao}
      key={edicao.documento.versao ?? edicao.documento.id}
    />
  );
}
