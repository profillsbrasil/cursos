import type { motivoPonto } from "@cursos/db/schema/comum";

import { pontuaHoje } from "./registro";
import { PONTOS } from "./regras";
import { diaLocal } from "./sequencia";
import type { DiaISO } from "./tipos";

export type MotivoPonto = (typeof motivoPonto.enumValues)[number];

export interface LinhaDoExtrato {
  aula: { titulo: string } | null;
  criadoEm: Date;
  curso: { titulo: string } | null;
  id: string;
  liberacao: { curso: { titulo: string } | null } | null;
  motivo: MotivoPonto;
  pontos: number;
  trilha: { titulo: string } | null;
}

export interface ItemDoExtrato {
  dia: DiaISO;
  id: string;
  pontos: number;
  texto: string;
}

const referenciaAusente = (l: LinhaDoExtrato): Error =>
  new Error(`Lançamento ${l.id} (${l.motivo}) sem o fato que ele referencia.`);

function textoDoExtrato(l: LinhaDoExtrato): string {
  switch (l.motivo) {
    case "aula_assistida":
      if (!l.aula) {
        throw referenciaAusente(l);
      }
      return `Aula assistida: ${l.aula.titulo}`;
    case "curso_concluido":
      if (!l.curso) {
        throw referenciaAusente(l);
      }
      return `Curso concluído: ${l.curso.titulo}`;
    case "trilha_concluida":
      if (!l.trilha) {
        throw referenciaAusente(l);
      }
      return `Trilha concluída: ${l.trilha.titulo}`;
    case "sequencia_7_dias":
      return "7 dias úteis seguidos";
    case "troca":
      if (!l.liberacao?.curso) {
        throw referenciaAusente(l);
      }
      return `Troca: ${l.liberacao.curso.titulo}`;
    default:
      return l.motivo satisfies never;
  }
}

export const itemDoExtrato = (linha: LinhaDoExtrato): ItemDoExtrato => ({
  dia: diaLocal(linha.criadoEm),
  id: linha.id,
  pontos: linha.pontos,
  texto: textoDoExtrato(linha),
});

type RegraDePonto = keyof typeof PONTOS;

const ROTULOS: Record<RegraDePonto, string> = {
  aula_assistida: "Aula assistida (90% do vídeo)",
  curso_concluido: "Curso concluído",
  prova_aprovada: "Prova aprovada",
  quiz_acerto: "Acerto no quiz de fixação, primeira tentativa",
  sequencia_7_dias: "7 dias úteis seguidos",
  trilha_concluida: "Trilha concluída",
};

const ORDEM: readonly RegraDePonto[] = [
  "aula_assistida",
  "quiz_acerto",
  "prova_aprovada",
  "curso_concluido",
  "trilha_concluida",
  "sequencia_7_dias",
];

export interface RegraDeGanho {
  emBreve: boolean;
  pontos: number;
  rotulo: string;
}

export const comoGanhar = (): readonly RegraDeGanho[] =>
  ORDEM.map((regra) => ({
    emBreve: !pontuaHoje(regra),
    pontos: PONTOS[regra],
    rotulo: ROTULOS[regra],
  }));
