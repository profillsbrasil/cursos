import { edicaoDeCursoNovo } from "@cursos/api/dominio/edicao-do-curso";
import type { CursoId } from "@cursos/api/dominio/tipos";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EditorDoCurso } from "@/components/admin/editor-do-curso";
import { VoltaParaALista } from "@/components/admin/volta-para-a-lista";
import { abrirOuRascunho } from "@/lib/abrir-ou-rascunho";
import { carregarCategorias, carregarCurso } from "@/server/api";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ novo?: string | string[] }>;
}

// React.cache divide o carregarCurso entre o título e a página.
async function abrir({ params, searchParams }: Props) {
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
  return edicao;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { documento } = await abrir(props);
  return { title: documento.titulo.trim() || "Curso novo" };
}

export default async function Curso(props: Props) {
  const [edicao, categorias] = await Promise.all([
    abrir(props),
    carregarCategorias(),
  ]);
  return (
    <>
      <VoltaParaALista href="/admin/catalogo" nome="Catálogo" />
      <EditorDoCurso
        categorias={categorias}
        edicao={edicao}
        key={edicao.documento.id}
      />
    </>
  );
}
