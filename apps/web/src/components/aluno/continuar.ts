import type { Retomada } from "@cursos/api/dominio/painel";
import type { Route } from "next";

import { faltam, fmtMin, minutos, plural } from "@/lib/formato";
import { hrefDaRetomada } from "@/lib/rotas";

/** O cartão "Continuar" do rodapé, montado no servidor: o cliente recebe só texto, um número e o href. */
export interface Continuar {
  /** "Continuar · faltam 7 min", "Começar curso", "Faltam 3 questionários". */
  chamada: string;
  /** A linha no lugar da chamada quando a pessoa já está no destino. */
  chamadaAqui: string;
  /** O título do curso, no nome acessível e na dica: a aula sozinha não diz de que curso é. */
  curso: string;
  href: Route;
  /** % do curso para a barra; null em "comecar", que não tem barra. */
  pct: number | null;
  /** Nome acessível do link e tooltip da sidebar recolhida. */
  rotulo: string;
  /** Escolhe o ícone do botão redondo: a lista de checks no questionário, Play no resto. */
  tipo: Retomada["tipo"];
  /** O título da aula; no questionário, "Questionário · título da aula". */
  titulo: string;
}

function textos(r: Retomada) {
  switch (r.tipo) {
    case "continuar":
      return {
        chamada: `Continuar · ${faltam(minutos(r.aula.faltaSeg)).toLowerCase()} ${fmtMin(r.aula.faltaSeg)}`,
        chamadaAqui: "Assistindo agora",
        pct: r.progresso.pct,
        titulo: r.aula.titulo,
      };
    case "comecar":
      return {
        chamada: "Começar curso",
        chamadaAqui: "Assistindo agora",
        pct: null,
        titulo: r.aula.titulo,
      };
    case "questionario": {
      const faltamN = r.questionarios.total - r.questionarios.feitas;
      return {
        chamada: `${faltam(faltamN)} ${plural(faltamN, "questionário", "questionários")}`,
        chamadaAqui: "Você está no questionário",
        pct: r.questionarios.pct,
        titulo: `Questionário · ${r.aula.titulo}`,
      };
    }
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
    curso: retomada.curso.titulo,
    href: hrefDaRetomada(retomada),
    rotulo: `${t.chamada}: ${t.titulo}, ${retomada.curso.titulo}${porcentagem}`,
    tipo: retomada.tipo,
  };
}

/** O botão que retoma o estudo, com o mesmo verbo no banner de Meus cursos e em Trocar pontos. */
export interface AcaoDaRetomada {
  href: Route;
  icone: "play" | "questionario" | null;
  texto: string;
}

export function acaoDaRetomada(retomada: Retomada | null): AcaoDaRetomada {
  if (!retomada) {
    return { href: "/meus-cursos", icone: null, texto: "Ver Meus cursos" };
  }
  const href = hrefDaRetomada(retomada);
  switch (retomada.tipo) {
    case "comecar":
      return { href, icone: "play", texto: "Começar curso" };
    case "continuar":
      return { href, icone: "play", texto: "Continuar aula" };
    case "questionario":
      return {
        href,
        icone: "questionario",
        texto: retomada.ultima ? "Tentar de novo" : "Fazer o questionário",
      };
    default:
      return retomada satisfies never;
  }
}

/**
 * A pessoa está onde o cartão leva. O cartão vira texto, sem link, e troca os
 * minutos pela chamadaAqui: o player grava a posição sem refresh, e os minutos
 * estariam velhos.
 */
export const estaAqui = (c: Continuar, caminho: string) => caminho === c.href;
