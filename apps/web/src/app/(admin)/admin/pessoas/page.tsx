import { diaLocal } from "@cursos/api/dominio/sequencia";
import type { Metadata } from "next";

import {
  BarraDaLista,
  contagemDePessoas,
} from "@/components/admin/barra-da-lista";
import { Convidar } from "@/components/admin/pessoas/convidar";
import { contagemDeConvidados } from "@/components/admin/pessoas/convites";
import { ListaDeConvidados } from "@/components/admin/pessoas/lista-de-convidados";
import { ListaDePessoasDoAdmin } from "@/components/admin/pessoas/lista-de-pessoas";
import {
  ORDEM_DOS_PERFIS,
  SOBRE_O_PERFIL,
} from "@/components/admin/pessoas/perfis";
import {
  camposDaVisao,
  hrefDaVisao,
  visaoDe,
} from "@/components/admin/pessoas/visao";
import { CabecalhoDaPagina } from "@/components/casca/cabecalho-da-pagina";
import { carregarConvites, carregarListaDePessoas } from "@/server/api";

export const metadata: Metadata = { title: "Pessoas" };

const umTexto = (v: string | string[] | undefined) =>
  typeof v === "string" ? v : "";

export default async function Pessoas({
  searchParams,
}: {
  searchParams: Promise<{
    perfil?: string | string[];
    q?: string | string[];
    ver?: string | string[];
  }>;
}) {
  const busca = await searchParams;
  const termo = umTexto(busca.q).trim().slice(0, 100);
  const visao = visaoDe(busca);
  const perfil = visao.tipo === "perfil" ? visao.perfil : null;
  const deConvidados = visao.tipo === "convidados";
  // O painel de convites dá os números da trilha e os cursos do diálogo em toda
  // visão. A lista de pessoas, que vai ao Clerk, só carrega quando aparece.
  const [lista, convites] = await Promise.all([
    deConvidados ? null : carregarListaDePessoas(termo, perfil),
    carregarConvites(deConvidados ? termo : ""),
  ]);
  const opcoes = [
    {
      ativa: visao.tipo === "todos",
      href: hrefDaVisao({ tipo: "todos" }, termo),
      n: null,
      rotulo: "Todos",
    },
    ...ORDEM_DOS_PERFIS.map((p) => ({
      ativa: p === perfil,
      href: hrefDaVisao({ perfil: p, tipo: "perfil" }, termo),
      n: convites.contagem[p],
      rotulo: SOBRE_O_PERFIL[p].plural,
    })),
    {
      ativa: deConvidados,
      href: hrefDaVisao({ tipo: "convidados" }, termo),
      n: convites.total,
      rotulo: "Convidados",
    },
  ];
  return (
    <>
      <CabecalhoDaPagina
        acao={<Convidar cursos={convites.cursos} />}
        resumo="Quem tem conta, o perfil e o papel de cada um"
        titulo="Pessoas"
      />
      <BarraDaLista
        busca={{
          acao: "/admin/pessoas",
          campos: camposDaVisao(visao),
          id: "busca-de-pessoas",
          rotulo: deConvidados ? "E-mail" : undefined,
          termo,
        }}
        contagem={
          lista
            ? contagemDePessoas(lista.pessoas.length, lista.total, termo)
            : contagemDeConvidados(
                convites.convidados.length,
                convites.total,
                termo
              )
        }
        opcoes={opcoes}
        rotuloDasOpcoes="Filtrar por perfil ou ver os convidados"
      />
      {lista ? (
        <ListaDePessoasDoAdmin
          hoje={diaLocal(new Date())}
          lista={lista}
          termo={termo}
        />
      ) : (
        <ListaDeConvidados convites={convites} termo={termo} />
      )}
    </>
  );
}
