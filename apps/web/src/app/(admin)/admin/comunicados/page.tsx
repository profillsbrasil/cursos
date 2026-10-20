import type { Metadata } from "next";

import { Comunicados } from "@/components/admin/comunicados";
import { CabecalhoDaPagina } from "@/components/casca/cabecalho-da-pagina";
import { carregarComunicados } from "@/server/api";

export const metadata: Metadata = { title: "Comunicados" };

export default async function PaginaDeComunicados() {
  const dados = await carregarComunicados();
  return (
    <>
      <CabecalhoDaPagina
        resumo="O aluno vê o mais recente em Meus cursos e todos em Comunicados"
        titulo="Comunicados"
      />
      <Comunicados {...dados} />
    </>
  );
}
