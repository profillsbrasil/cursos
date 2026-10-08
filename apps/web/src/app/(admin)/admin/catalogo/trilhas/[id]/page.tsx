import { edicaoDeTrilhaNova } from "@cursos/api/dominio/edicao-da-trilha";
import type { TrilhaId } from "@cursos/api/dominio/tipos";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EditorDaTrilha } from "@/components/admin/editor-da-trilha";
import { carregarCatalogo, carregarTrilha } from "@/server/api";

export const metadata: Metadata = { title: "Trilha · Admin" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Trilha({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ novo?: string }>;
}) {
  const [{ id }, { novo }] = await Promise.all([params, searchParams]);
  if (!UUID.test(id)) {
    notFound();
  }
  const [edicao, catalogo] = await Promise.all([
    novo === "1"
      ? edicaoDeTrilhaNova(id.toLowerCase() as TrilhaId)
      : carregarTrilha(id),
    carregarCatalogo(),
  ]);
  if (!edicao) {
    notFound();
  }
  return (
    <EditorDaTrilha
      cursos={catalogo.cursos}
      edicao={edicao}
      key={edicao.documento.versao ?? edicao.documento.id}
    />
  );
}
