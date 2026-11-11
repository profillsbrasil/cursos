import { diaLocal } from "@cursos/api/dominio/sequencia";
import type { Metadata, Route } from "next";

import {
  BarraDaLista,
  contagemDePessoas,
} from "@/components/admin/barra-da-lista";
import { ListaDePessoasDoAdmin } from "@/components/admin/pessoas/lista-de-pessoas";
import {
  ehPerfil,
  ORDEM_DOS_PERFIS,
  SOBRE_O_PERFIL,
} from "@/components/admin/pessoas/perfis";
import { CabecalhoDaPagina } from "@/components/casca/cabecalho-da-pagina";
import { carregarListaDePessoas } from "@/server/api";

export const metadata: Metadata = { title: "Pessoas" };

const umTexto = (v: string | string[] | undefined) =>
  typeof v === "string" ? v : "";

const comFiltro = (perfil: string | null, termo: string): Route => {
  const busca = new URLSearchParams();
  if (perfil) {
    busca.set("perfil", perfil);
  }
  if (termo) {
    busca.set("q", termo);
  }
  const texto = busca.toString();
  return (texto ? `/admin/pessoas?${texto}` : "/admin/pessoas") as Route;
};

export default async function Pessoas({
  searchParams,
}: {
  searchParams: Promise<{ perfil?: string | string[]; q?: string | string[] }>;
}) {
  const busca = await searchParams;
  const termo = umTexto(busca.q).trim().slice(0, 100);
  const pedido = umTexto(busca.perfil);
  const perfil = ehPerfil(pedido) ? pedido : null;
  const lista = await carregarListaDePessoas(termo, perfil);
  const filtros = [
    {
      ativa: perfil === null,
      href: comFiltro(null, termo),
      n: null,
      rotulo: "Todos",
    },
    ...ORDEM_DOS_PERFIS.map((p) => ({
      ativa: p === perfil,
      href: comFiltro(p, termo),
      n: lista.contagem[p],
      rotulo: SOBRE_O_PERFIL[p].plural,
    })),
  ];
  return (
    <>
      <CabecalhoDaPagina
        resumo="Quem tem conta, o perfil e o papel de cada um"
        titulo="Pessoas"
      />
      <BarraDaLista
        busca={{
          acao: "/admin/pessoas",
          campos: perfil ? { perfil } : undefined,
          id: "busca-de-pessoas",
          termo,
        }}
        contagem={contagemDePessoas(lista.pessoas.length, lista.total, termo)}
        opcoes={filtros}
        rotuloDasOpcoes="Filtrar por perfil"
      />
      <ListaDePessoasDoAdmin
        hoje={diaLocal(new Date())}
        lista={lista}
        termo={termo}
      />
    </>
  );
}
