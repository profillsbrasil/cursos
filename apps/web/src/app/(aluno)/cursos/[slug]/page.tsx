import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { carregarPainel } from "@/server/api";

export const metadata: Metadata = { title: "Curso · Profills School" };

// Stub: o player chega no próximo PR. Só abre curso que o aluno tem liberado.
export default async function Curso({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [{ slug }, painel] = await Promise.all([params, carregarPainel()]);
  const curso = [
    ...painel.trilhas.flatMap((t) => t.cursos),
    ...painel.soltos,
  ].find((c) => c.slug === slug);
  if (!curso) {
    notFound();
  }
  return (
    <div className="grid gap-3">
      <h1 className="font-bold text-3xl text-titulo tracking-tight">
        {curso.titulo}
      </h1>
      <p className="text-muted-foreground">O player chega no próximo PR.</p>
      <Link
        className="text-ceu underline underline-offset-4"
        href="/meus-cursos"
      >
        Voltar para Meus cursos
      </Link>
    </div>
  );
}
