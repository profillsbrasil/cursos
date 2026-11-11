import type { Route } from "next";

import type { OpcaoDaBarra } from "./barra-da-lista";

const ABAS = [
  { href: "/admin/liberacoes" as Route, id: "pessoa", rotulo: "Por pessoa" },
  {
    href: "/admin/liberacoes/perfis" as Route,
    id: "perfil",
    rotulo: "Por perfil",
  },
] as const;

/** As duas telas de Liberações, como opções da barra: cada aba é um endereço. */
export const abasDasLiberacoes = (
  ativa: (typeof ABAS)[number]["id"]
): OpcaoDaBarra[] =>
  ABAS.map((a) => ({
    ativa: a.id === ativa,
    href: a.href,
    n: null,
    rotulo: a.rotulo,
  }));
