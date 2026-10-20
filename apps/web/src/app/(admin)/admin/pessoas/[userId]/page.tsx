import { diaLocal } from "@cursos/api/dominio/sequencia";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FichaDaPessoaDoAdmin } from "@/components/admin/pessoas/ficha-da-pessoa";
import { carregarFichaDaPessoa } from "@/server/api";

interface Props {
  params: Promise<{ userId: string }>;
}

const fichaDaUrl = async (params: Props["params"]) => {
  const ficha = await carregarFichaDaPessoa((await params).userId);
  if (!ficha) {
    notFound();
  }
  return ficha;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: (await fichaDaUrl(params)).conta.nome };
}

export default async function Pessoa({ params }: Props) {
  const ficha = await fichaDaUrl(params);
  return <FichaDaPessoaDoAdmin ficha={ficha} hoje={diaLocal(new Date())} />;
}
