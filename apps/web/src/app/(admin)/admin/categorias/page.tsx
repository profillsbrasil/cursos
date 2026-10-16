import type { Metadata } from "next";

import { Categorias } from "@/components/admin/categorias";
import { plural } from "@/lib/formato";
import { carregarCategorias } from "@/server/api";

export const metadata: Metadata = { title: "Categorias · Admin" };

export default async function PaginaDeCategorias() {
  const categorias = await carregarCategorias();
  const cursos = categorias.reduce((n, c) => n + c.cursos.length, 0);
  return (
    <>
      <header className="mb-8 grid gap-1.5">
        <h1 className="text-balance font-bold text-3xl text-titulo tracking-tight">
          Categorias
        </h1>
        <p className="text-muted-foreground tabular-nums">
          {plural(categorias.length, "categoria", "categorias")},{" "}
          {plural(cursos, "curso", "cursos")}
        </p>
      </header>
      <Categorias categorias={categorias} />
    </>
  );
}
