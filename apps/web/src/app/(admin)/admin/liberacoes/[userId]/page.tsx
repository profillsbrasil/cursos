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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pessoa, userId } = await acessoDaUrl(params);
  return { title: `Acesso de ${pessoa?.nome ?? userId}` };
}

export default async function Acesso({ params }: Props) {
  const acesso = await acessoDaUrl(params);
  return <AcessoDoAluno acesso={acesso} />;
}
