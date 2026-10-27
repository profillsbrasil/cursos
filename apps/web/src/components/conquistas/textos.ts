import type {
  CertificadoNaTela,
  Conquistas,
  Contagem,
  CursoPerto,
  Marco,
  MedalhaDaGrade,
  MetaDeAulas,
  TipoDaGrade,
} from "@cursos/api/dominio/conquistas";
import {
  FIM_DE_SEMANA_NAO_QUEBRA,
  siglaDoDia as siglaDaSemana,
} from "@cursos/api/dominio/sequencia";
import type { DiaISO } from "@cursos/api/dominio/tipos";

import { diaCurto, faltam, fmtNum, fmtPts, plural } from "@/lib/formato";

import type { DiaDaSequencia } from "./dias-da-sequencia";

export type MarcoDo<T extends Marco["tipo"]> = Extract<Marco, { tipo: T }>;

const NOME: Record<TipoDaGrade, string> = {
  amostra_e_troca: "Da amostra à troca",
  mil_pontos: "Mil pontos estudando",
  nota_cheia: "Nota cheia",
  primeira_aula: "Primeira aula",
  primeira_troca: "Primeira troca",
  primeiro_curso: "Primeiro curso concluído",
  primeiro_questionario: "Primeiro questionário",
  tres_cursos: "Três cursos concluídos",
  tres_trocas: "Três cursos trocados",
  troca_ate_o_fim: "Troca até o fim",
};

/**
 * Uma medalha da grade em texto. A por ganhar diz o que falta numa frase curta
 * (`falta`) e, no cartão em destaque, mais uma (`detalhe`).
 */
export type LinhaDaGrade = { nome: string; tipo: TipoDaGrade } & (
  | { estado: "ganha"; dia: string }
  | { estado: "por_ganhar"; detalhe: string; falta: string; pct: number }
);

type PorGanhar<M extends MedalhaDaGrade> = Extract<
  M["medalha"],
  { estado: "por_ganhar" }
>;

type MedalhaDo<T extends TipoDaGrade> = Extract<MedalhaDaGrade, { tipo: T }>;

interface Frases {
  detalhe: string;
  falta: string;
}

function proximoPassoDoCursoMaisPerto(c: CursoPerto) {
  const resta = c.total - c.feitas;
  if (resta === 0) {
    return `Só faltam os questionários de ${c.curso}.`;
  }
  if (c.feitas === 0) {
    return `${c.curso} tem ${plural(c.total, "aula", "aulas")}.`;
  }
  return `${faltam(resta)} ${plural(resta, "aula", "aulas")} em ${c.curso}.`;
}

function primeiraAula(m: PorGanhar<MedalhaDo<"primeira_aula">>): Frases {
  const p = m.proxima;
  const verbo = p?.tipo === "continuar" ? "Termine" : "Comece por";
  return {
    detalhe: "A aula conta quando você a assiste até o fim.",
    falta: p
      ? `${verbo} ${p.aula}, em ${p.curso}.`
      : "Assista a uma aula até o fim.",
  };
}

const primeiraTroca = (m: PorGanhar<MedalhaDo<"primeira_troca">>): Frases => ({
  detalhe: `Cada aula vale ${fmtPts(m.pontosPorAula)}.`,
  falta:
    m.maisBarato === null
      ? "Nenhum curso novo para trocar agora."
      : `O curso mais barato custa ${fmtPts(m.maisBarato)}.`,
});

const primeiroCurso = (m: PorGanhar<MedalhaDo<"primeiro_curso">>): Frases => ({
  detalhe:
    "O certificado sai com todas as aulas assistidas e todos os questionários aprovados.",
  falta: m.maisPerto
    ? proximoPassoDoCursoMaisPerto(m.maisPerto)
    : "Conclua um curso e receba o certificado.",
});

const tresTrocas = (m: Contagem): Frases => {
  const resta = m.total - m.feitas;
  return {
    detalhe: `Você trocou ${fmtNum(m.feitas)} de ${plural(m.total, "curso", "cursos")}.`,
    falta: `${faltam(resta)} ${plural(resta, "troca", "trocas")}.`,
  };
};

const amostraETroca = (m: PorGanhar<MedalhaDo<"amostra_e_troca">>): Frases =>
  m.amostraVista === null
    ? {
        detalhe:
          "A amostra é a primeira aula de um curso que você ainda não tem.",
        falta: `${faltam(m.total)} ${plural(m.total, "passo", "passos")}: ver uma amostra e trocar o curso.`,
      }
    : {
        detalhe: "Você já assistiu à amostra; a troca é o segundo passo.",
        falta: `Falta trocar ${m.amostraVista}.`,
      };

function trocaAteOFim(m: PorGanhar<MedalhaDo<"troca_ate_o_fim">>): Frases {
  const detalhe = "O certificado de um curso que você trocou fecha a medalha.";
  const c = m.maisAdiantado;
  if (!c) {
    return { detalhe, falta: "Troque um curso e conclua-o." };
  }
  return {
    detalhe,
    falta:
      c.feitas === c.total
        ? `Só faltam os questionários de ${c.curso}.`
        : `${fmtNum(c.feitas)} de ${plural(c.total, "aula", "aulas")} de ${c.curso}.`,
  };
}

const notaCheia = (m: PorGanhar<MedalhaDo<"nota_cheia">>): Frases =>
  m.melhor
    ? {
        detalhe:
          "Acerte todas as perguntas de um questionário na primeira tentativa.",
        falta: `Seu melhor de primeira foi ${fmtNum(m.melhor.feitas)} de ${fmtNum(m.melhor.total)}.`,
      }
    : {
        detalhe: "Só a primeira tentativa de cada questionário conta.",
        falta: "Acerte todas as perguntas na primeira tentativa.",
      };

const tresCursos = (m: Contagem): Frases => {
  const resta = m.total - m.feitas;
  return {
    detalhe: "Cada certificado conta um curso concluído.",
    falta: `${faltam(resta)} ${plural(resta, "curso", "cursos")}.`,
  };
};

const milPontos = (m: Contagem): Frases => ({
  detalhe: "Bônus e pontos do admin não contam.",
  falta: `${fmtNum(m.feitas)} de ${fmtPts(m.total)}.`,
});

function frases(m: MedalhaDaGrade): Frases {
  const p = m.medalha;
  if (p.estado === "ganha") {
    throw new Error("A medalha ganha não tem o que falta.");
  }
  switch (m.tipo) {
    case "primeira_aula":
      return primeiraAula(p as PorGanhar<typeof m>);
    case "primeira_troca":
      return primeiraTroca(p as PorGanhar<typeof m>);
    case "primeiro_curso":
      return primeiroCurso(p as PorGanhar<typeof m>);
    case "tres_trocas":
      return tresTrocas(p as PorGanhar<typeof m>);
    case "amostra_e_troca":
      return amostraETroca(p as PorGanhar<typeof m>);
    case "troca_ate_o_fim":
      return trocaAteOFim(p as PorGanhar<typeof m>);
    case "primeiro_questionario":
      return {
        detalhe: "Você pode tentar de novo quantas vezes quiser.",
        falta: "Seja aprovado no questionário de uma aula.",
      };
    case "nota_cheia":
      return notaCheia(p as PorGanhar<typeof m>);
    case "tres_cursos":
      return tresCursos(p as PorGanhar<typeof m>);
    case "mil_pontos":
      return milPontos(p as PorGanhar<typeof m>);
    default:
      return m satisfies never;
  }
}

export function linhaDaGrade(m: MedalhaDaGrade): LinhaDaGrade {
  const base = { nome: NOME[m.tipo], tipo: m.tipo };
  return m.medalha.estado === "ganha"
    ? { ...base, dia: m.medalha.dia, estado: "ganha" }
    : { ...base, estado: "por_ganhar", pct: m.medalha.pct, ...frases(m) };
}

const peloNome = (a: { nome: string }, b: { nome: string }) =>
  a.nome.localeCompare(b.nome, "pt-BR");

/**
 * As ganhas pela data, as por ganhar da maior porcentagem para a menor; o
 * empate vai pelo nome.
 */
export function gradeDasMedalhas(medalhas: readonly MedalhaDaGrade[]): {
  ganhas: Extract<LinhaDaGrade, { estado: "ganha" }>[];
  porGanhar: Extract<LinhaDaGrade, { estado: "por_ganhar" }>[];
} {
  const linhas = medalhas.map(linhaDaGrade);
  return {
    ganhas: linhas
      .filter((l) => l.estado === "ganha")
      .sort((a, b) => a.dia.localeCompare(b.dia) || peloNome(a, b)),
    porGanhar: linhas
      .filter((l) => l.estado === "por_ganhar")
      .sort((a, b) => b.pct - a.pct || peloNome(a, b)),
  };
}

export const contagemDaGrade = (medalhas: readonly MedalhaDaGrade[]) =>
  `${fmtNum(ganhas(medalhas.map((m) => m.medalha)))} de ${fmtNum(medalhas.length)}`;

/** O cartão Ganhas sem nenhuma: a primeira vem com a primeira aula. */
export function semGanha(medalhas: readonly MedalhaDaGrade[]): string {
  const aula = medalhas.find((m) => m.tipo === "primeira_aula");
  const passo =
    aula?.medalha.estado === "por_ganhar" && aula.medalha.proxima
      ? ` ${frases(aula).falta}`
      : "";
  return `Sua primeira medalha vem com uma aula assistida até o fim.${passo}`;
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

const proximoDegrau = (degraus: readonly DegrauDaTrilha[]) =>
  degraus.find((d) => d.medalha.estado === "por_ganhar");

export function tituloDaTrilha(
  feitas: number,
  degraus: readonly DegrauDaTrilha[]
): [string, string] {
  const proximo = proximoDegrau(degraus);
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

/** O degrau seguinte fica só com a meta: o título da trilha já diz quanto falta para ele. */
export const legendaDoDegrau = (
  d: DegrauDaTrilha,
  degraus: readonly DegrauDaTrilha[],
  feitas: number,
  hoje: string
) => {
  if (d.medalha.estado === "ganha") {
    return ganhaEm(d.medalha.dia, hoje);
  }
  if (d === proximoDegrau(degraus)) {
    return null;
  }
  const resta = d.meta - feitas;
  return `${faltam(resta)} ${plural(resta, "aula", "aulas")}`;
};

const SEM_QUEBRA = `${FIM_DE_SEMANA_NAO_QUEBRA}.`;

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
    return `${conta} Assista a uma aula hoje para chegar a ${fmtNum(dias + 1)}. ${SEM_QUEBRA}`;
  }
  const resta = meta - dias;
  return `${conta} ${faltam(resta)} ${plural(resta, "dia útil", "dias úteis")}.`;
}

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
  d.estado === "hoje" ? "Hoje" : siglaDaSemana(d.dia);

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
  const todas = [...c.marcos, ...c.medalhas].map((m) => m.medalha);
  const n = ganhas(todas) + ganhas(c.certificados);
  const total = todas.length + c.certificados.length;
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
