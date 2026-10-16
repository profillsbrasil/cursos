import type {
  CertificadoNaTela,
  Conquistas,
  Marco,
} from "@cursos/api/dominio/conquistas";

import { diaCurto, faltam, fmtNum, fmtPts, plural } from "@/lib/formato";

/** A barra de quanto falta, com o número escrito ao lado ("3 de 7 dias úteis"). */
export interface Progresso {
  feitas: number;
  total: number;
  unidade: string;
}

/**
 * O que a linha do marco escreve. Ganho: o dia e o fato que deu a medalha. Por
 * ganhar: a barra, quando o marco se conta, e o próximo passo.
 */
export type LinhaDoMarco = { nome: string; regra: string } & (
  | { estado: "ganha"; dia: string; detalhe: string | null }
  | { estado: "por_ganhar"; progresso: Progresso | null; dica: string | null }
);

const REGRA_DA_SEQUENCIA =
  "Assista a uma aula nova em 7 dias úteis seguidos. Sábado e domingo não quebram.";

function primeiraAula(
  m: Extract<Marco, { tipo: "primeira_aula" }>["medalha"]
): LinhaDoMarco {
  const base = {
    nome: "Primeira aula",
    regra: "Assista a uma aula até o fim.",
  };
  if (m.estado === "ganha") {
    return {
      ...base,
      detalhe: `${m.aula}, em ${m.curso}`,
      dia: m.dia,
      estado: "ganha",
    };
  }
  const p = m.proxima;
  const verbo = p?.tipo === "continuar" ? "Termine" : "Comece por";
  return {
    ...base,
    dica: p ? `${verbo} ${p.aula}, em ${p.curso}.` : null,
    estado: "por_ganhar",
    progresso: null,
  };
}

function aulas(m: Extract<Marco, { tipo: "aulas" }>): LinhaDoMarco {
  const base = {
    nome: `${fmtNum(m.meta)} aulas`,
    regra: `Assista a ${fmtNum(m.meta)} aulas até o fim.`,
  };
  if (m.medalha.estado === "ganha") {
    return { ...base, detalhe: null, dia: m.medalha.dia, estado: "ganha" };
  }
  return {
    ...base,
    dica: null,
    estado: "por_ganhar",
    progresso: {
      feitas: Math.min(m.medalha.feitas, m.meta),
      total: m.meta,
      unidade: "aulas",
    },
  };
}

function dicaDaSequencia(dias: number, hojePendente: boolean, meta: number) {
  if (dias === 0) {
    return "Uma aula por dia útil, por 7 dias.";
  }
  if (hojePendente) {
    return `Assista uma aula hoje para chegar a ${fmtNum(dias + 1)}.`;
  }
  const resta = meta - dias;
  return `${faltam(resta)} ${plural(resta, "dia útil", "dias úteis")}.`;
}

function sequencia(
  m: Extract<Marco, { tipo: "sequencia" }>["medalha"]
): LinhaDoMarco {
  const base = { nome: "Sete dias seguidos", regra: REGRA_DA_SEQUENCIA };
  if (m.estado === "ganha") {
    return {
      ...base,
      detalhe: m.vezes > 1 ? `${fmtNum(m.vezes)} vezes até hoje` : null,
      dia: m.dia,
      estado: "ganha",
    };
  }
  return {
    ...base,
    dica: dicaDaSequencia(m.dias, m.hojePendente, m.meta),
    estado: "por_ganhar",
    progresso: { feitas: m.dias, total: m.meta, unidade: "dias úteis" },
  };
}

function primeiraTroca(
  m: Extract<Marco, { tipo: "primeira_troca" }>["medalha"]
): LinhaDoMarco {
  const base = { nome: "Primeira troca", regra: "Troque pontos por um curso." };
  if (m.estado === "ganha") {
    return {
      ...base,
      detalhe: `${m.curso}, por ${fmtPts(m.pontos)}`,
      dia: m.dia,
      estado: "ganha",
    };
  }
  const porAula = `Cada aula vale ${fmtPts(m.pontosPorAula)}`;
  return {
    ...base,
    dica:
      m.maisBarato === null
        ? `${porAula}. Nenhum curso novo para trocar agora.`
        : `${porAula}; o curso mais barato custa ${fmtPts(m.maisBarato)}.`,
    estado: "por_ganhar",
    progresso: null,
  };
}

function primeiroCurso(
  m: Extract<Marco, { tipo: "primeiro_curso" }>["medalha"]
): LinhaDoMarco {
  const base = {
    nome: "Primeiro curso concluído",
    regra: "Conclua um curso e receba o certificado.",
  };
  if (m.estado === "ganha") {
    return { ...base, detalhe: m.curso, dia: m.dia, estado: "ganha" };
  }
  return {
    ...base,
    dica: m.maisPerto ? dicaDoCursoMaisPerto(m.maisPerto) : null,
    estado: "por_ganhar",
    progresso: null,
  };
}

function dicaDoCursoMaisPerto(c: {
  curso: string;
  feitas: number;
  total: number;
}) {
  const resta = c.total - c.feitas;
  if (resta === 0) {
    return `Só faltam os questionários de ${c.curso}.`;
  }
  if (c.feitas === 0) {
    return `${c.curso} tem ${plural(c.total, "aula", "aulas")}.`;
  }
  return `${faltam(resta)} ${plural(resta, "aula", "aulas")} em ${c.curso}.`;
}

export function linhaDoMarco(m: Marco): LinhaDoMarco {
  switch (m.tipo) {
    case "primeira_aula":
      return primeiraAula(m.medalha);
    case "aulas":
      return aulas(m);
    case "sequencia":
      return sequencia(m.medalha);
    case "primeira_troca":
      return primeiraTroca(m.medalha);
    case "primeiro_curso":
      return primeiroCurso(m.medalha);
    default:
      return m satisfies never;
  }
}

/** O código do emitido, ou o que falta para ganhar. */
export const linhaDoCertificado = (c: CertificadoNaTela) =>
  c.estado === "ganha"
    ? `Código ${c.codigo}`
    : "Assista a todas as aulas e passe nos questionários.";

const ganhas = (xs: readonly { estado: string }[]) =>
  xs.filter((x) => x.estado === "ganha").length;

/** "4 medalhas ganhas de 12", ou "Nenhuma medalha ainda". */
export function contagemDasMedalhas(c: Conquistas): string {
  const n = ganhas(c.marcos.map((m) => m.medalha)) + ganhas(c.certificados);
  const total = c.marcos.length + c.certificados.length;
  return n === 0
    ? "Nenhuma medalha ainda"
    : `${plural(n, "medalha ganha", "medalhas ganhas")} de ${fmtNum(total)}`;
}

export const contagemDosMarcos = (marcos: readonly Marco[]) =>
  `${fmtNum(ganhas(marcos.map((m) => m.medalha)))} de ${fmtNum(marcos.length)}`;

export const contagemDosCertificados = (
  certificados: readonly CertificadoNaTela[]
) =>
  `${fmtNum(ganhas(certificados))} de ${plural(certificados.length, "curso", "cursos")}`;

export const ganhaEm = (dia: string, hoje: string) =>
  `Ganha em ${diaCurto(dia, hoje)}`;

export const emitidoEm = (dia: string, hoje: string) =>
  `Emitido em ${diaCurto(dia, hoje)}`;
