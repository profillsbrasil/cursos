import type {
  CertificadoNaTela,
  Conquistas,
  Marco,
  MetaDeAulas,
} from "@cursos/api/dominio/conquistas";
import type { DiaISO } from "@cursos/api/dominio/tipos";

import { diaCurto, faltam, fmtNum, fmtPts, plural } from "@/lib/formato";

import type { DiaDaSequencia } from "./dias-da-sequencia";

export type MarcoDo<T extends Marco["tipo"]> = Extract<Marco, { tipo: T }>;

export type PrimeiraVez = MarcoDo<
  "primeira_aula" | "primeira_troca" | "primeiro_curso"
>;

export const ehPrimeiraVez = (m: Marco): m is PrimeiraVez =>
  m.tipo === "primeira_aula" ||
  m.tipo === "primeira_troca" ||
  m.tipo === "primeiro_curso";

export type LinhaDaPrimeiraVez = { nome: string } & (
  | { estado: "ganha"; dia: string; fato: string }
  | { estado: "por_ganhar"; proximoPasso: string }
);

function primeiraAula(
  m: MarcoDo<"primeira_aula">["medalha"]
): LinhaDaPrimeiraVez {
  const nome = "Primeira aula";
  if (m.estado === "ganha") {
    return {
      dia: m.dia,
      estado: "ganha",
      fato: `${m.aula}, em ${m.curso}`,
      nome,
    };
  }
  const p = m.proxima;
  const verbo = p?.tipo === "continuar" ? "Termine" : "Comece por";
  return {
    estado: "por_ganhar",
    nome,
    proximoPasso: p
      ? `${verbo} ${p.aula}, em ${p.curso}.`
      : "Assista a uma aula até o fim.",
  };
}

function primeiraTroca(
  m: MarcoDo<"primeira_troca">["medalha"]
): LinhaDaPrimeiraVez {
  const nome = "Primeira troca";
  if (m.estado === "ganha") {
    return {
      dia: m.dia,
      estado: "ganha",
      fato: `${m.curso}, por ${fmtPts(m.pontos)}`,
      nome,
    };
  }
  const porAula = `Cada aula vale ${fmtPts(m.pontosPorAula)}`;
  return {
    estado: "por_ganhar",
    nome,
    proximoPasso:
      m.maisBarato === null
        ? `${porAula}. Nenhum curso novo para trocar agora.`
        : `${porAula}; o curso mais barato custa ${fmtPts(m.maisBarato)}.`,
  };
}

function proximoPassoDoCursoMaisPerto(c: {
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

function primeiroCurso(
  m: MarcoDo<"primeiro_curso">["medalha"]
): LinhaDaPrimeiraVez {
  const nome = "Primeiro curso concluído";
  if (m.estado === "ganha") {
    return { dia: m.dia, estado: "ganha", fato: m.curso, nome };
  }
  return {
    estado: "por_ganhar",
    nome,
    proximoPasso: m.maisPerto
      ? proximoPassoDoCursoMaisPerto(m.maisPerto)
      : "Conclua um curso e receba o certificado.",
  };
}

export function linhaDaPrimeiraVez(m: PrimeiraVez): LinhaDaPrimeiraVez {
  switch (m.tipo) {
    case "primeira_aula":
      return primeiraAula(m.medalha);
    case "primeira_troca":
      return primeiraTroca(m.medalha);
    case "primeiro_curso":
      return primeiroCurso(m.medalha);
    default:
      return m satisfies never;
  }
}

export interface DegrauDaTrilha {
  medalha: MarcoDo<"aulas">["medalha"];
  meta: MetaDeAulas;
}

/**
 * As três medalhas de aulas como uma trilha. Toda medalha por ganhar conta as
 * mesmas aulas; com as três ganhas, a trilha para na última meta.
 */
export function trilhaDeAulas(marcos: readonly Marco[]): {
  degraus: DegrauDaTrilha[];
  feitas: number;
} {
  const degraus = marcos.flatMap((m) =>
    m.tipo === "aulas" ? [{ medalha: m.medalha, meta: m.meta }] : []
  );
  const porGanhar = degraus.find((d) => d.medalha.estado === "por_ganhar");
  return {
    degraus,
    feitas:
      porGanhar?.medalha.estado === "por_ganhar"
        ? porGanhar.medalha.feitas
        : (degraus.at(-1)?.meta ?? 0),
  };
}

export function tituloDaTrilha(
  feitas: number,
  degraus: readonly DegrauDaTrilha[]
): [string, string] {
  const proximo = degraus.find((d) => d.medalha.estado === "por_ganhar");
  if (!proximo) {
    return [
      `${plural(feitas, "aula assistida", "aulas assistidas")}.`,
      "As três medalhas de aulas são suas.",
    ];
  }
  const resta = proximo.meta - feitas;
  return [
    `${plural(feitas, "aula assistida", "aulas assistidas")}.`,
    `${faltam(resta)} ${fmtNum(resta)} para a medalha de ${fmtNum(proximo.meta)}.`,
  ];
}

export const legendaDoDegrau = (
  d: DegrauDaTrilha,
  feitas: number,
  hoje: string
) => {
  if (d.medalha.estado === "ganha") {
    return ganhaEm(d.medalha.dia, hoje);
  }
  const resta = d.meta - feitas;
  return `${faltam(resta)} ${plural(resta, "aula", "aulas")}`;
};

const SEM_QUEBRA = "Sábado e domingo não quebram.";

export function fraseDaSequencia(
  dias: number,
  hojePendente: boolean,
  meta: number
) {
  if (dias === 0) {
    return `Uma aula por dia útil, por ${fmtNum(meta)} dias. ${SEM_QUEBRA}`;
  }
  const conta = `${fmtNum(dias)} de ${fmtNum(meta)} dias úteis.`;
  if (hojePendente) {
    return `${conta} Assista uma aula hoje para chegar a ${fmtNum(dias + 1)}. ${SEM_QUEBRA}`;
  }
  const resta = meta - dias;
  return `${conta} ${faltam(resta)} ${plural(resta, "dia útil", "dias úteis")}.`;
}

const SIGLAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
const NOMES = [
  "domingo",
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
] as const;

const diaDaSemana = (dia: DiaISO) => new Date(`${dia}T12:00:00Z`).getUTCDay();

export const diaDoMes = (d: DiaDaSequencia) => Number(d.dia.slice(8));

export const siglaDoDia = (d: DiaDaSequencia) =>
  d.estado === "hoje" ? "Hoje" : SIGLAS[diaDaSemana(d.dia)];

const ESTADO_DO_DIA: Record<DiaDaSequencia["estado"], string> = {
  feito: "com aula",
  hoje: "hoje, ainda sem aula",
  por_vir: "por vir",
};

export const rotuloDoDia = (d: DiaDaSequencia, hoje: string) =>
  `${NOMES[diaDaSemana(d.dia)]}, ${diaCurto(d.dia, hoje)}: ${ESTADO_DO_DIA[d.estado]}`;

export const porcentagem = (feitas: number, total: number) =>
  total === 0 ? 0 : Math.floor((feitas * 100) / total);

export const emitidoEm = (
  c: Extract<CertificadoNaTela, { estado: "ganha" }>,
  hoje: string
) =>
  `Emitido em ${diaCurto(c.dia, hoje)} · ${plural(c.horas, "hora", "horas")}`;

const ganhas = (xs: readonly { estado: string }[]) =>
  xs.filter((x) => x.estado === "ganha").length;

export function contagemDasMedalhas(c: Conquistas): string {
  const n = ganhas(c.marcos.map((m) => m.medalha)) + ganhas(c.certificados);
  const total = c.marcos.length + c.certificados.length;
  return n === 0
    ? "Nenhuma medalha ainda"
    : `${plural(n, "medalha ganha", "medalhas ganhas")} de ${fmtNum(total)}`;
}

export const contagemDosCertificados = (
  certificados: readonly CertificadoNaTela[]
) =>
  `${fmtNum(ganhas(certificados))} de ${plural(certificados.length, "curso", "cursos")}`;

export const ganhaEm = (dia: string, hoje: string) =>
  `Ganha em ${diaCurto(dia, hoje)}`;
