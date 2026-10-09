import { edicaoDeTrilhaNova } from "@cursos/api/dominio/edicao-da-trilha";
import type { TrilhaId } from "@cursos/api/dominio/tipos";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EditorDaTrilha } from "@/components/admin/editor-da-trilha";
import { abrirOuRascunho } from "@/lib/abrir-ou-rascunho";
import { carregarCatalogo, carregarTrilha } from "@/server/api";

export const metadata: Metadata = { title: "Trilha · Admin" };

export default async function Trilha({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ novo?: string | string[] }>;
}) {
  const [{ id }, { novo }] = await Promise.all([params, searchParams]);
  const [edicao, catalogo] = await Promise.all([
    abrirOuRascunho(
      { id, novo },
      {
        carregar: carregarTrilha,
        rascunho: (minusculo) => edicaoDeTrilhaNova(minusculo as TrilhaId),
      }
    ),
    carregarCatalogo(),
  ]);
  if (!edicao) {
    notFound();
  }
  return (
    <EditorDaTrilha
      cursos={catalogo.cursos}
      edicao={edicao}
      key={edicao.documento.id}
    />
  );
}
