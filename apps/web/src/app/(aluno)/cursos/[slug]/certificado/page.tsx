import { diaLocal } from "@cursos/api/dominio/sequencia";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { BuscaEmBreve, TopoDoAluno } from "@/components/aluno/topo";
import { origemDoPedido } from "@/components/certificado/folha";
import { TelaDoCertificado } from "@/components/certificado/tela-do-certificado";
import { carregarPaginaDoCertificado } from "@/server/api";

interface Props {
  params: Promise<{ slug: string }>;
}

export const metadata: Metadata = { title: "Seu certificado" };

export default async function Certificado({ params }: Props) {
  const pagina = await carregarPaginaDoCertificado((await params).slug);
  if (!pagina) {
    notFound();
  }
  return (
    <>
      <TopoDoAluno esquerda={<BuscaEmBreve />} />
      <h1 className="text-balance font-bold text-3xl text-titulo leading-[1.2] tracking-tight">
        Seu certificado
      </h1>
      <TelaDoCertificado
        hoje={diaLocal(new Date())}
        origem={origemDoPedido(await headers())}
        pagina={pagina}
      />
    </>
  );
}
