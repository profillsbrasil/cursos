import type { Metadata } from "next";

import { Categorias } from "@/components/admin/categorias";
import { CabecalhoDaPagina } from "@/components/casca/cabecalho-da-pagina";
import { plural } from "@/lib/formato";
import { carregarCategorias } from "@/server/api";

export const metadata: Metadata = { title: "Categorias" };

export default async function PaginaDeCategorias() {
  const categorias = await carregarCategorias();
  const cursos = categorias.reduce((n, c) => n + c.cursos.length, 0);
  return (
    <>
      <CabecalhoDaPagina
        resumo={`${plural(categorias.length, "categoria", "categorias")}, ${plural(cursos, "curso", "cursos")}`}
        titulo="Categorias"
      />
      <Categorias categorias={categorias} />
    </>
  );
}
