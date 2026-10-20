import { diaLocal } from "@cursos/api/dominio/sequencia";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FichaDaPessoaDoAdmin } from "@/components/admin/pessoas/ficha-da-pessoa";
import { carregarFichaDaPessoa } from "@/server/api";

export const metadata: Metadata = { title: "Pessoa · Admin" };

export default async function Pessoa({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const ficha = await carregarFichaDaPessoa((await params).userId);
  if (!ficha) {
    notFound();
  }
  return <FichaDaPessoaDoAdmin ficha={ficha} hoje={diaLocal(new Date())} />;
}
