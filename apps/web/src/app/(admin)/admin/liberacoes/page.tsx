import type { Metadata } from "next";

import { abasDasLiberacoes } from "@/components/admin/abas-das-liberacoes";
import {
  BarraDaLista,
  contagemDePessoas,
} from "@/components/admin/barra-da-lista";
import { TelaDeAlunos } from "@/components/admin/tela-de-alunos";
import { CabecalhoDaPagina } from "@/components/casca/cabecalho-da-pagina";
import { carregarCatalogo, carregarPessoas } from "@/server/api";

export const metadata: Metadata = { title: "Liberações" };

export default async function Alunos({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { q } = await searchParams;
  const termo = typeof q === "string" ? q.trim().slice(0, 100) : "";
  const [resultado, catalogo] = await Promise.all([
    carregarPessoas(termo),
    carregarCatalogo(),
  ]);
  return (
    <>
      <CabecalhoDaPagina
        resumo="Marque pessoas para liberar um curso, ou abra uma para ver o acesso"
        titulo="Liberações"
      />
      <BarraDaLista
        busca={{ acao: "/admin/liberacoes", id: "busca-de-alunos", termo }}
        contagem={contagemDePessoas(
          resultado.pessoas.length,
          resultado.total,
          termo
        )}
        opcoes={abasDasLiberacoes("pessoa")}
        rotuloDasOpcoes="Liberar por"
      />
      <TelaDeAlunos
        cursos={catalogo.cursos}
        resultado={resultado}
        termo={termo}
      />
    </>
  );
}
