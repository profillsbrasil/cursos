import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { caminhoDaAula } from "@/lib/rotas";
import { carregarEntrada } from "@/server/api";

export const metadata: Metadata = { title: "Curso · Profills School" };

// Curso em andamento ou não iniciado vai direto para a aula de retomada. Prova e
// concluído ficam aqui até a tela da prova existir.
export default async function Curso({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entrada = await carregarEntrada(slug);
  if (!entrada) {
    notFound();
  }
  if (entrada.tipo === "aula") {
    redirect(caminhoDaAula(slug, entrada.aulaId));
  }
  return (
    <div className="grid gap-3">
      <h1 className="font-bold text-3xl text-titulo tracking-tight">
        {entrada.tipo === "prova"
          ? "Você assistiu a todas as aulas"
          : "Curso concluído"}
      </h1>
      <p className="text-muted-foreground">
        {entrada.tipo === "prova"
          ? "A prova chega no próximo PR."
          : "Seu certificado já foi emitido."}
      </p>
      <div className="flex flex-wrap gap-4">
        <Link
          className="text-ceu underline underline-offset-4"
          href={caminhoDaAula(slug, entrada.primeira)}
        >
          Rever aulas
        </Link>
        <Link
          className="text-ceu underline underline-offset-4"
          href="/meus-cursos"
        >
          Voltar para Meus cursos
        </Link>
      </div>
    </div>
  );
}
