import { diaLocal } from "@cursos/api/dominio/sequencia";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { CabecalhoDaPagina } from "@/components/casca/cabecalho-da-pagina";
import { origemDoPedido } from "@/components/certificado/folha";
import { TelaDoCertificado } from "@/components/certificado/tela-do-certificado";
import { carregarPaginaDoCertificado } from "@/server/api";

interface Props {
  params: Promise<{ slug: string }>;
}

const paginaDaUrl = async (params: Props["params"]) => {
  const pagina = await carregarPaginaDoCertificado((await params).slug);
  if (!pagina) {
    notFound();
  }
  return pagina;
};

// O notFound() aqui também: só assim o Next troca o título pelo do not-found.tsx
// do curso.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const pagina = await paginaDaUrl(params);
  const curso =
    pagina.tipo === "emitido"
      ? pagina.certificado.tituloDoCurso
      : pagina.curso.titulo;
  return { title: `Certificado · ${curso}` };
}

export default async function Certificado({ params }: Props) {
  const pagina = await paginaDaUrl(params);
  return (
    <>
      <CabecalhoDaPagina
        resumo={pagina.tipo === "falta" ? pagina.curso.titulo : null}
        titulo="Seu certificado"
      />
      <TelaDoCertificado
        hoje={diaLocal(new Date())}
        origem={origemDoPedido(await headers())}
        pagina={pagina}
      />
    </>
  );
}
