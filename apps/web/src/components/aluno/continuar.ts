import type { Retomada } from "@cursos/api/dominio/painel";
import type { Route } from "next";

import { faltam, fmtMin, minutos } from "@/lib/formato";
import { hrefDaRetomada } from "@/lib/rotas";

/** O cartão "Continuar" do rodapé, montado no servidor: o cliente recebe só texto, um número e o href. */
export interface Continuar {
  /** "Continuar · faltam 7 min", "Começar curso", "Falta a prova". */
  chamada: string;
  /** A linha no lugar da chamada quando a pessoa já está no destino. */
  chamadaAqui: string;
  href: Route;
  /** % do curso para a barra; null em "comecar", que não tem barra. */
  pct: number | null;
  /** Nome acessível do link e tooltip da sidebar recolhida. */
  rotulo: string;
  /** Escolhe o ícone do botão redondo: Award na prova, Play no resto. */
  tipo: Retomada["tipo"];
  /** "Pilar Urgência · Aula 4"; na prova, o título do curso. */
  titulo: string;
}

function textos(r: Retomada) {
  switch (r.tipo) {
    case "continuar":
      return {
        chamada: `Continuar · ${faltam(minutos(r.aula.faltaSeg)).toLowerCase()} ${fmtMin(r.aula.faltaSeg)}`,
        chamadaAqui: "Assistindo agora",
        pct: r.progresso.pct,
        titulo: `${r.modulo.titulo} · Aula ${r.aula.numeroNoModulo}`,
      };
    case "comecar":
      return {
        chamada: "Começar curso",
        chamadaAqui: "Assistindo agora",
        pct: null,
        titulo: `${r.modulo.titulo} · Aula ${r.aula.numeroNoModulo}`,
      };
    case "prova":
      return {
        chamada: "Falta a prova",
        // A página do curso ainda diz que a prova não existe: "Você está na prova" mentiria.
        chamadaAqui: "Falta só a prova",
        pct: r.progresso.pct,
        titulo: r.curso.titulo,
      };
    default: {
      const nenhum: never = r;
      return nenhum;
    }
  }
}

/** null: sem retomada ("Tudo em dia" no banner), e o rodapé não desenha o cartão. */
export function continuarDe(retomada: Retomada | null): Continuar | null {
  if (!retomada) {
    return null;
  }
  const t = textos(retomada);
  const porcentagem = t.pct === null ? "" : `, ${t.pct}% do curso`;
  return {
    ...t,
    href: hrefDaRetomada(retomada),
    rotulo: `${t.chamada}: ${t.titulo}${porcentagem}`,
    tipo: retomada.tipo,
  };
}

/**
 * A pessoa está onde o cartão leva. O cartão vira texto, sem link, e troca os
 * minutos pela chamadaAqui: o player grava a posição sem refresh, e os minutos
 * estariam velhos.
 */
export const estaAqui = (c: Continuar, caminho: string) => caminho === c.href;
