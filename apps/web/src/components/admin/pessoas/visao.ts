import type { Perfil } from "@cursos/api/dominio/perfil";
import type { Route } from "next";

import { ehPerfil } from "./perfis";

/** O que a tela Pessoas mostra: quem tem conta, por perfil ou não, ou quem foi convidado. */
export type VisaoDePessoas =
  | { tipo: "todos" }
  | { tipo: "perfil"; perfil: Perfil }
  | { tipo: "convidados" };

const CONVIDADOS = "convidados";

const umTexto = (v: string | string[] | undefined) =>
  typeof v === "string" ? v : "";

/** A única leitura de ?ver= e ?perfil=. `ver=convidados` vence; perfil inválido vale "todos". */
export function visaoDe(busca: {
  perfil?: string | string[];
  ver?: string | string[];
}): VisaoDePessoas {
  if (umTexto(busca.ver) === CONVIDADOS) {
    return { tipo: "convidados" };
  }
  const perfil = umTexto(busca.perfil);
  return ehPerfil(perfil) ? { perfil, tipo: "perfil" } : { tipo: "todos" };
}

/** Os parâmetros que guardam a visão na URL, sem a busca. */
export function camposDaVisao(
  visao: VisaoDePessoas
): Record<string, string> | undefined {
  switch (visao.tipo) {
    case "todos":
      return;
    case "perfil":
      return { perfil: visao.perfil };
    case "convidados":
      return { ver: CONVIDADOS };
    default:
      return visao satisfies never;
  }
}

/** O único lugar que monta /admin/pessoas?... */
export function hrefDaVisao(visao: VisaoDePessoas, termo: string): Route {
  const busca = new URLSearchParams(camposDaVisao(visao));
  if (termo) {
    busca.set("q", termo);
  }
  const texto = busca.toString();
  return (texto ? `/admin/pessoas?${texto}` : "/admin/pessoas") as Route;
}
