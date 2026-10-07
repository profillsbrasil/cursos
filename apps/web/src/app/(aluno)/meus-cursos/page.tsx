import type { Metadata } from "next";

import { plural } from "@/lib/formato";
import { carregarPainel } from "@/server/api";

export const metadata: Metadata = { title: "Meus cursos · Profills School" };

export default async function MeusCursos() {
  const painel = await carregarPainel();
  return (
    <header className="mb-7 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1.5">
      <h1 className="font-bold text-3xl text-titulo tracking-tight">
        Meus cursos
      </h1>
      <p className="text-muted-foreground">
        {plural(painel.trilhas.length, "trilha", "trilhas")} e{" "}
        {plural(painel.soltos.length, "curso rápido", "cursos rápidos")}{" "}
        liberados para você
      </p>
    </header>
  );
}
