import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AcessoDoAluno } from "@/components/admin/acesso-do-aluno";
import { carregarAcessoDoAluno } from "@/server/api";

export const metadata: Metadata = { title: "Acesso · Admin" };

export default async function Acesso({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const acesso = await carregarAcessoDoAluno((await params).userId);
  if (!acesso) {
    notFound();
  }
  return <AcessoDoAluno acesso={acesso} />;
}
