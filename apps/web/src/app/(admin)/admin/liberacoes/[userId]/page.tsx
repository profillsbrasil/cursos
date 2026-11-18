import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AcessoDoAluno } from "@/components/admin/acesso-do-aluno";
import { carregarAcessoDoAluno } from "@/server/api";

interface Props {
  params: Promise<{ userId: string }>;
}

const acessoDaUrl = async (params: Props["params"]) => {
  const acesso = await carregarAcessoDoAluno((await params).userId);

  if (!acesso) {
    notFound();
  }

  return acesso;
};

export async function generateMetadata({ params }: Props) {
  const { pessoa, userId } = await acessoDaUrl(params);

  const metadata: Metadata = { title: `Acesso de ${pessoa?.nome ?? userId}` };

  return metadata;
}

export default async function Acesso({ params }: Props) {
  const acesso = await acessoDaUrl(params);

  return <AcessoDoAluno acesso={acesso} />;
}
