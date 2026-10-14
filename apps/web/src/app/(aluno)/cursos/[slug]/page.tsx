import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BuscaEmBreve, TopoDoAluno } from "@/components/aluno/topo";
import { caminhoDaAula } from "@/lib/rotas";
import { carregarEntrada } from "@/server/api";

export const metadata: Metadata = { title: "Curso" };

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
    <>
      <TopoDoAluno esquerda={<BuscaEmBreve />} />
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
            className="text-ceu underline underline-offset-4 hover:text-titulo"
            href={caminhoDaAula(slug, entrada.primeira)}
          >
            Rever aulas
          </Link>
          <Link
            className="text-ceu underline underline-offset-4 hover:text-titulo"
            href="/meus-cursos"
          >
            Voltar para Meus cursos
          </Link>
        </div>
      </div>
    </>
  );
}
