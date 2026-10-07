import type { motivoPonto } from "@cursos/db/schema/comum";

import { PONTOS } from "./regras";
import { diaLocal } from "./sequencia";
import type { DiaISO } from "./tipos";

export type MotivoPonto = (typeof motivoPonto.enumValues)[number];

/** Lançamento já ligado ao fato. Um ramo por motivo: motivo novo sem ramo não compila. */
export type Lancamento = { dia: DiaISO; id: string; pontos: number } & (
  | { aula: { titulo: string }; motivo: "aula_assistida" }
  | { curso: { titulo: string }; motivo: "curso_concluido" }
  | { motivo: "trilha_concluida"; trilha: { titulo: string } }
  | { motivo: "sequencia_7_dias" }
  | { curso: { slug: string; titulo: string }; motivo: "troca" }
);

/** Linha da relational query do extrato, antes do parse. */
export interface LinhaDoExtrato {
  aula: { titulo: string } | null;
  criadoEm: Date;
  curso: { titulo: string } | null;
  id: string;
  liberacao: { curso: { slug: string; titulo: string } | null } | null;
  motivo: MotivoPonto;
  pontos: number;
  trilha: { titulo: string } | null;
}

export interface ItemDoExtrato {
  dia: DiaISO;
  id: string;
  /** Com sinal: +10, -900. */
  pontos: number;
  /** "Aula assistida: O funil da semana", "Troca: Boas práticas de fabricação". */
  texto: string;
}

export function textoDoLancamento(l: Lancamento): string {
  switch (l.motivo) {
    case "aula_assistida":
      return `Aula assistida: ${l.aula.titulo}`;
    case "curso_concluido":
      return `Curso concluído: ${l.curso.titulo}`;
    case "trilha_concluida":
      return `Trilha concluída: ${l.trilha.titulo}`;
    case "sequencia_7_dias":
      return "7 dias úteis seguidos";
    case "troca":
      return `Troca: ${l.curso.titulo}`;
    default:
      return l satisfies never;
  }
}

const referenciaAusente = (l: LinhaDoExtrato): Error =>
  new Error(`Lançamento ${l.id} (${l.motivo}) sem o fato que ele referencia.`);

/** Linha -> Lancamento. Referência ausente é dado quebrado: lança Error. */
export function paraLancamento(linha: LinhaDoExtrato): Lancamento {
  const base = {
    dia: diaLocal(linha.criadoEm),
    id: linha.id,
    pontos: linha.pontos,
  };
  switch (linha.motivo) {
    case "aula_assistida":
      if (!linha.aula) {
        throw referenciaAusente(linha);
      }
      return { ...base, aula: linha.aula, motivo: linha.motivo };
    case "curso_concluido":
      if (!linha.curso) {
        throw referenciaAusente(linha);
      }
      return { ...base, curso: linha.curso, motivo: linha.motivo };
    case "trilha_concluida":
      if (!linha.trilha) {
        throw referenciaAusente(linha);
      }
      return { ...base, motivo: linha.motivo, trilha: linha.trilha };
    case "sequencia_7_dias":
      return { ...base, motivo: linha.motivo };
    case "troca": {
      const curso = linha.liberacao?.curso;
      if (!curso) {
        throw referenciaAusente(linha);
      }
      return { ...base, curso, motivo: linha.motivo };
    }
    default:
      return linha.motivo satisfies never;
  }
}

export const itemDoExtrato = (linha: LinhaDoExtrato): ItemDoExtrato => {
  const l = paraLancamento(linha);
  return {
    dia: l.dia,
    id: l.id,
    pontos: l.pontos,
    texto: textoDoLancamento(l),
  };
};

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

export const comoGanhar = (): readonly { pontos: number; rotulo: string }[] =>
  ORDEM.map((regra) => ({ pontos: PONTOS[regra], rotulo: ROTULOS[regra] }));
