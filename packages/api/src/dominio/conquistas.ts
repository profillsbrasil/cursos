import { aulaDeAmostra } from "./curso";
import { lerCursoDoAluno } from "./curso-do-aluno";
import { estudoDe, type LinhaDoQuestionario } from "./historico";
import { cargaHoraria } from "./pagina-do-certificado";
import {
  type CursoVM,
  type LinhasPainel,
  montarPainel,
  type PainelMeusCursos,
  paraCatalogo,
  type Retomada,
} from "./painel";
import type { MotivoPonto } from "./pontos";
import { META_SEQUENCIA, PONTOS } from "./regras";
import { diaLocal, ehDiaUtil, sequenciaDiasUteis } from "./sequencia";
import {
  type Capa,
  type CursoId,
  capaDe,
  type DiaISO,
  type LinhaDaCapa,
  type TipoEstado,
} from "./tipos";
import { type CursoDaTroca, situacao } from "./troca";

/** As trocas de Três cursos trocados. */
export const META_DE_TROCAS = 3;
/** Os certificados de Três cursos concluídos. */
export const META_DE_CURSOS = 3;
/** As entradas de estudo de Mil pontos estudando. */
export const META_DE_PONTOS_DE_ESTUDO = 1000;
/** Da amostra à troca: assistir à amostra de um curso e trocar aquele curso. */
export const PASSOS_DA_AMOSTRA_A_TROCA = 2;

/**
 * Os questionários por aula do painel, mais o que as medalhas de questionário
 * leem: quando veio a aprovação e a nota da tentativa número 1.
 */
export interface TentativasDaAula extends LinhaDoQuestionario {
  aprovadaEm: Date | null;
  primeiraAcertos: number | null;
  primeiraEm: Date | null;
  primeiraTotal: number | null;
}

export interface LinhasDasConquistas {
  /** Toda aula assistida, também de curso revogado, com os títulos da aula e do curso. */
  assistidas: readonly {
    assistidaEm: Date;
    aula: string;
    aulaId: string;
    curso: string;
  }[];
  /** Todo certificado, também de curso revogado. */
  certificados: readonly {
    codigo: string;
    curso: LinhaDaCapa & { slug: string; titulo: string };
    cursoId: string;
    emitidoEm: Date;
    /** A soma dos vídeos congelada na emissão, a mesma da folha. */
    segundosDeVideo: number;
  }[];
  /**
   * As entradas de estudo somadas por dia de São Paulo: os lançamentos positivos
   * fora de FORA_DOS_PONTOS_DA_SEMANA, sem o bônus e sem a concessão.
   */
  estudoPorDia: readonly { dia: string; pontos: number }[];
  /**
   * Os lançamentos de sequência e de troca. Na troca, `cursoId` é o curso da
   * liberação; na sequência, null.
   */
  lancamentos: readonly {
    criadoEm: Date;
    cursoId: string | null;
    motivo: MotivoPonto;
  }[];
  liberacoes: LinhasPainel["liberacoes"];
  posicoes: LinhasPainel["posicoes"];
  /** Os questionários do aluno por aula, com a aprovação e a tentativa 1. */
  questionarios: readonly TentativasDaAula[];
  /** A vitrine de Trocar pontos, para o preço do curso trocável mais barato. */
  vitrine: readonly CursoDaTroca[];
}

/** A medalha ganha leva o dia, em São Paulo, em que o fato aconteceu. */
export type Medalha<Ganha, PorGanhar> =
  | ({ estado: "ganha"; dia: DiaISO } & Ganha)
  | ({ estado: "por_ganhar" } & PorGanhar);

export interface AulaNoCurso {
  aula: string;
  curso: string;
}

export const METAS_DE_AULAS = [10, 50, 100] as const;
export type MetaDeAulas = (typeof METAS_DE_AULAS)[number];

/** As aulas de um curso: quantas a pessoa assistiu de quantas. */
export interface CursoPerto {
  curso: string;
  feitas: number;
  total: number;
}

/** A trilha de aulas e a sequência, os marcos de cima da tela. */
export type Marco =
  | {
      tipo: "aulas";
      meta: MetaDeAulas;
      medalha: Medalha<Record<never, never>, { feitas: number }>;
    }
  | {
      tipo: "sequencia";
      medalha: Medalha<
        { vezes: number },
        { dias: number; hojePendente: boolean; meta: number }
      >;
    };

interface NaGrade<T extends string, PorGanhar> {
  medalha: Medalha<Record<never, never>, { pct: number } & PorGanhar>;
  tipo: T;
}

/** Uma contagem até a meta: trocas, certificados, pontos ou passos. */
export interface Contagem {
  feitas: number;
  total: number;
}

/**
 * As dez medalhas da grade. A por ganhar leva a porcentagem cumprida (`pct`,
 * arredondada para baixo e menor que 100) e o que a frase do que falta precisa.
 */
export type MedalhaDaGrade =
  | NaGrade<
      "primeira_aula",
      { proxima: (AulaNoCurso & { tipo: "comecar" | "continuar" }) | null }
    >
  | NaGrade<
      "primeira_troca",
      { maisBarato: number | null; pontosPorAula: number }
    >
  | NaGrade<"primeiro_curso", { maisPerto: CursoPerto | null }>
  | NaGrade<"tres_trocas", Contagem>
  | NaGrade<"amostra_e_troca", Contagem & { amostraVista: string | null }>
  | NaGrade<"troca_ate_o_fim", { maisAdiantado: CursoPerto | null }>
  | NaGrade<"primeiro_questionario", Record<never, never>>
  | NaGrade<"nota_cheia", { melhor: Contagem | null }>
  | NaGrade<"tres_cursos", Contagem>
  | NaGrade<"mil_pontos", Contagem>;

export type TipoDaGrade = MedalhaDaGrade["tipo"];

export interface CursoDoCertificado {
  capa: Capa;
  id: CursoId;
  slug: string;
  titulo: string;
}

/**
 * Um por curso: o emitido, que fica mesmo com a liberação revogada, ou o do curso
 * de liberação ativa que ainda abre aula e não tem certificado. A amostra fica
 * de fora.
 */
export type CertificadoNaTela = { curso: CursoDoCertificado } & Medalha<
  { codigo: string; horas: number },
  { categoria: string; feitas: number; total: number }
>;

export interface Conquistas {
  /** Os emitidos pela data, depois os por ganhar na ordem de Meus cursos. */
  certificados: readonly CertificadoNaTela[];
  /** O dia em São Paulo: a data curta ganha o ano quando ele muda. */
  hoje: DiaISO;
  /** A trilha (10, 50 e 100 aulas) e Sete dias seguidos. */
  marcos: readonly Marco[];
  /** As dez medalhas da grade, sempre na mesma ordem; a tela as ordena. */
  medalhas: readonly MedalhaDaGrade[];
}

/**
 * A porcentagem da medalha por ganhar: para baixo, e nunca 100 sem a medalha
 * (199 de 200 dá 99%, e as aulas todas de um curso com questionário por
 * aprovar também).
 */
export const porcentagemPorGanhar = (feitas: number, total: number) =>
  total <= 0 ? 0 : Math.min(99, Math.floor((feitas * 100) / total));

type Ganho<T extends { estado: string }> = Extract<T, { estado: "ganha" }>;

const ganha = (quando: Date) => ({
  dia: diaLocal(quando),
  estado: "ganha" as const,
});

const oMaisAntigo = <T extends { criadoEm: Date }>(
  xs: readonly T[]
): T | undefined =>
  xs.reduce<T | undefined>(
    (min, x) => (!min || x.criadoEm < min.criadoEm ? x : min),
    undefined
  );

const primeiraData = (datas: readonly (Date | null)[]): Date | undefined =>
  datas.reduce<Date | undefined>(
    (min, d) => (d && (!min || d < min) ? d : min),
    undefined
  );

type Assistida = LinhasDasConquistas["assistidas"][number];
type Lancamento = LinhasDasConquistas["lancamentos"][number];
interface Troca {
  criadoEm: Date;
  cursoId: string;
}

function certificados(
  linhas: LinhasDasConquistas,
  painel: PainelMeusCursos
): {
  emitidos: Ganho<CertificadoNaTela>[];
  porGanhar: Extract<CertificadoNaTela, { estado: "por_ganhar" }>[];
} {
  const emitidos = [...linhas.certificados]
    .sort((a, b) => a.emitidoEm.getTime() - b.emitidoEm.getTime())
    .map((c) => ({
      codigo: c.codigo,
      curso: {
        capa: capaDe(c.curso),
        id: c.cursoId as CursoId,
        slug: c.curso.slug,
        titulo: c.curso.titulo,
      },
      dia: diaLocal(c.emitidoEm),
      estado: "ganha" as const,
      horas: cargaHoraria(c.segundosDeVideo),
    }));
  // A amostra não conclui o curso, então não tem certificado por ganhar.
  const porGanhar = cursosQueAbremAula(painel).map((c) => ({
    categoria: c.categoria,
    curso: { capa: c.capa, id: c.id, slug: c.slug, titulo: c.titulo },
    estado: "por_ganhar" as const,
    feitas: c.progresso.feitas,
    total: c.progresso.total,
  }));
  return { emitidos, porGanhar };
}

const ABREM_AULA: ReadonlySet<TipoEstado> = new Set([
  "nao_iniciado",
  "em_andamento",
  "questionarios",
]);

/** Os cursos inteiros que ainda abrem aula: os do certificado por ganhar. */
const cursosQueAbremAula = (painel: PainelMeusCursos): CursoVM[] =>
  painel.cursos.filter(
    (c) => c.amostra === null && ABREM_AULA.has(c.estado.tipo)
  );

const metaDeAulas = (
  assistidas: readonly Assistida[],
  meta: MetaDeAulas
): Marco => {
  const aDaMeta = assistidas[meta - 1];
  return {
    medalha: aDaMeta
      ? ganha(aDaMeta.assistidaEm)
      : { estado: "por_ganhar", feitas: assistidas.length },
    meta,
    tipo: "aulas",
  };
};

function sequencia(
  lancamentos: readonly Lancamento[],
  assistidas: readonly Assistida[],
  hoje: DiaISO
): Marco {
  const vezes = lancamentos.filter((l) => l.motivo === "sequencia_7_dias");
  const aPrimeira = oMaisAntigo(vezes);
  if (aPrimeira) {
    return {
      medalha: { ...ganha(aPrimeira.criadoEm), vezes: vezes.length },
      tipo: "sequencia",
    };
  }
  const dias = new Set(assistidas.map((a) => diaLocal(a.assistidaEm)));
  return {
    medalha: {
      dias: Math.min(sequenciaDiasUteis(dias, hoje), META_SEQUENCIA),
      estado: "por_ganhar",
      hojePendente: ehDiaUtil(hoje) && !dias.has(hoje),
      meta: META_SEQUENCIA,
    },
    tipo: "sequencia",
  };
}

/** As trocas em ordem de data; a troca sem o curso da liberação é erro do banco. */
function trocasDe(lancamentos: readonly Lancamento[]): Troca[] {
  return lancamentos
    .filter((l) => l.motivo === "troca")
    .map((l) => {
      if (l.cursoId === null) {
        throw new Error("Lançamento de troca sem o curso da liberação.");
      }
      return { criadoEm: l.criadoEm, cursoId: l.cursoId };
    })
    .sort((a, b) => a.criadoEm.getTime() - b.criadoEm.getTime());
}

/** A medalha de contagem: ganha no dia do fato de número `total`. */
function contagem<T extends "tres_trocas" | "tres_cursos">(
  tipo: T,
  datas: readonly Date[],
  total: number
): Extract<MedalhaDaGrade, { tipo: T }> {
  const ordenadas = [...datas].sort((a, b) => a.getTime() - b.getTime());
  const aDaMeta = ordenadas[total - 1];
  return {
    medalha: aDaMeta
      ? ganha(aDaMeta)
      : {
          estado: "por_ganhar",
          feitas: ordenadas.length,
          pct: porcentagemPorGanhar(ordenadas.length, total),
          total,
        },
    tipo,
  } as Extract<MedalhaDaGrade, { tipo: T }>;
}

function primeiraAula(
  assistidas: readonly Assistida[],
  r: Retomada | null
): MedalhaDaGrade {
  const [a] = assistidas;
  return {
    medalha: a
      ? ganha(a.assistidaEm)
      : {
          estado: "por_ganhar",
          pct: 0,
          proxima:
            r && r.tipo !== "questionario"
              ? { aula: r.aula.titulo, curso: r.curso.titulo, tipo: r.tipo }
              : null,
        },
    tipo: "primeira_aula",
  };
}

function primeiraTroca(
  trocas: readonly Troca[],
  vitrine: readonly CursoDaTroca[]
): MedalhaDaGrade {
  const [aPrimeira] = trocas;
  if (aPrimeira) {
    return { medalha: ganha(aPrimeira.criadoEm), tipo: "primeira_troca" };
  }
  const precos = vitrine.flatMap((c) => {
    const s = situacao(c, 0);
    return s.tipo === "a_venda" ? [s.preco] : [];
  });
  return {
    medalha: {
      estado: "por_ganhar",
      maisBarato: precos.length > 0 ? Math.min(...precos) : null,
      pct: 0,
      pontosPorAula: PONTOS.aula_assistida,
    },
    tipo: "primeira_troca",
  };
}

/** O curso de maior porcentagem; no empate, o de menos itens por fazer. */
function oMaisAdiantado<T extends { feitas: number; total: number }>(
  xs: readonly T[]
): T | null {
  return xs.reduce<T | null>((melhor, x) => {
    if (!melhor) {
      return x;
    }
    const pct = porcentagemPorGanhar(x.feitas, x.total);
    const melhorPct = porcentagemPorGanhar(melhor.feitas, melhor.total);
    if (pct !== melhorPct) {
      return pct > melhorPct ? x : melhor;
    }
    return x.total - x.feitas < melhor.total - melhor.feitas ? x : melhor;
  }, null);
}

/** Aulas e questionários de cada curso que ainda abre aula, como Meus cursos lê. */
function itensDosCursos(linhas: LinhasDasConquistas, painel: PainelMeusCursos) {
  const estudo = estudoDe(linhas);
  const abrem = new Set<string>(cursosQueAbremAula(painel).map((c) => c.id));
  return linhas.liberacoes.flatMap(({ curso }) => {
    if (!abrem.has(curso.id)) {
      return [];
    }
    const leitura = lerCursoDoAluno(paraCatalogo(curso), estudo);
    return [
      {
        aulas: leitura.progresso,
        curso: curso.titulo,
        cursoId: curso.id,
        feitas: leitura.progresso.feitas + leitura.questionarios.feitas,
        total: leitura.progresso.total + leitura.questionarios.total,
      },
    ];
  });
}

type ItensDoCurso = ReturnType<typeof itensDosCursos>[number];

const cursoPerto = (c: ItensDoCurso): CursoPerto => ({
  curso: c.curso,
  feitas: c.aulas.feitas,
  total: c.aulas.total,
});

function primeiroCurso(
  emitidos: readonly Ganho<CertificadoNaTela>[],
  itens: readonly ItensDoCurso[]
): MedalhaDaGrade {
  const [oPrimeiro] = emitidos;
  if (oPrimeiro) {
    return {
      medalha: { dia: oPrimeiro.dia, estado: "ganha" },
      tipo: "primeiro_curso",
    };
  }
  const perto = oMaisAdiantado(itens);
  return {
    medalha: {
      estado: "por_ganhar",
      maisPerto: perto ? cursoPerto(perto) : null,
      pct: perto ? porcentagemPorGanhar(perto.feitas, perto.total) : 0,
    },
    tipo: "primeiro_curso",
  };
}

/**
 * A troca de um curso cuja aula de amostra a pessoa assistiu antes da troca.
 * Por ganhar, o primeiro passo é a amostra vista de um curso que ela ainda não tem.
 */
function amostraETroca(
  linhas: LinhasDasConquistas,
  trocas: readonly Troca[],
  painel: PainelMeusCursos
): MedalhaDaGrade {
  const amostraDe = new Map(
    linhas.liberacoes.map(({ curso }) => [
      curso.id,
      aulaDeAmostra(paraCatalogo(curso)),
    ])
  );
  const vistaEm = new Map(
    linhas.assistidas.map((a) => [a.aulaId, a.assistidaEm])
  );
  const aTroca = trocas.find((t) => {
    const aula = amostraDe.get(t.cursoId);
    const vista = aula ? vistaEm.get(aula) : undefined;
    return vista !== undefined && vista < t.criadoEm;
  });
  if (aTroca) {
    return { medalha: ganha(aTroca.criadoEm), tipo: "amostra_e_troca" };
  }
  const vista = painel.cursos.find((c) => c.amostra?.vista);
  const feitas = vista ? 1 : 0;
  return {
    medalha: {
      amostraVista: vista?.titulo ?? null,
      estado: "por_ganhar",
      feitas,
      pct: porcentagemPorGanhar(feitas, PASSOS_DA_AMOSTRA_A_TROCA),
      total: PASSOS_DA_AMOSTRA_A_TROCA,
    },
    tipo: "amostra_e_troca",
  };
}

/** O certificado de um curso trocado; ganha no dia do fato mais novo dos dois. */
function trocaAteOFim(
  linhas: LinhasDasConquistas,
  trocas: readonly Troca[],
  itens: readonly ItensDoCurso[]
): MedalhaDaGrade {
  const trocadoEm = new Map(trocas.map((t) => [t.cursoId, t.criadoEm]));
  const fechadas = linhas.certificados.flatMap((c) => {
    const troca = trocadoEm.get(c.cursoId);
    return troca ? [troca > c.emitidoEm ? troca : c.emitidoEm] : [];
  });
  const quando = primeiraData(fechadas);
  if (quando) {
    return { medalha: ganha(quando), tipo: "troca_ate_o_fim" };
  }
  const adiantado = oMaisAdiantado(
    itens.filter((c) => trocadoEm.has(c.cursoId)).map(cursoPerto)
  );
  return {
    medalha: {
      estado: "por_ganhar",
      maisAdiantado: adiantado,
      pct: adiantado
        ? porcentagemPorGanhar(adiantado.feitas, adiantado.total)
        : 0,
    },
    tipo: "troca_ate_o_fim",
  };
}

function primeiroQuestionario(
  questionarios: readonly TentativasDaAula[]
): MedalhaDaGrade {
  const quando = primeiraData(questionarios.map((q) => q.aprovadaEm));
  return {
    medalha: quando ? ganha(quando) : { estado: "por_ganhar", pct: 0 },
    tipo: "primeiro_questionario",
  };
}

/** A tentativa número 1 com todas certas; por ganhar, o melhor acerto de primeira. */
function notaCheia(questionarios: readonly TentativasDaAula[]): MedalhaDaGrade {
  const primeiras = questionarios.flatMap((q) =>
    q.primeiraAcertos !== null &&
    q.primeiraTotal !== null &&
    q.primeiraEm !== null &&
    q.primeiraTotal > 0
      ? [
          {
            em: q.primeiraEm,
            feitas: q.primeiraAcertos,
            total: q.primeiraTotal,
          },
        ]
      : []
  );
  const quando = primeiraData(
    primeiras.filter((p) => p.feitas === p.total).map((p) => p.em)
  );
  if (quando) {
    return { medalha: ganha(quando), tipo: "nota_cheia" };
  }
  const melhor = primeiras.reduce<Contagem | null>(
    (m, p) =>
      !m ||
      p.feitas * m.total > m.feitas * p.total ||
      (p.feitas * m.total === m.feitas * p.total && p.feitas > m.feitas)
        ? { feitas: p.feitas, total: p.total }
        : m,
    null
  );
  return {
    medalha: {
      estado: "por_ganhar",
      melhor,
      pct: melhor ? porcentagemPorGanhar(melhor.feitas, melhor.total) : 0,
    },
    tipo: "nota_cheia",
  };
}

/** A soma das entradas de estudo; ganha no dia em que a soma chega à meta. */
function milPontos(
  estudoPorDia: LinhasDasConquistas["estudoPorDia"]
): MedalhaDaGrade {
  const dias = [...estudoPorDia].sort((a, b) => a.dia.localeCompare(b.dia));
  let soma = 0;
  for (const d of dias) {
    soma += d.pontos;
    if (soma >= META_DE_PONTOS_DE_ESTUDO) {
      return {
        medalha: { dia: d.dia as DiaISO, estado: "ganha" },
        tipo: "mil_pontos",
      };
    }
  }
  return {
    medalha: {
      estado: "por_ganhar",
      feitas: soma,
      pct: porcentagemPorGanhar(soma, META_DE_PONTOS_DE_ESTUDO),
      total: META_DE_PONTOS_DE_ESTUDO,
    },
    tipo: "mil_pontos",
  };
}

export function montarConquistas(
  linhas: LinhasDasConquistas,
  hoje: DiaISO
): Conquistas {
  const painel = montarPainel(
    {
      assistidas: linhas.assistidas,
      certificados: linhas.certificados,
      comunicados: [],
      liberacoes: linhas.liberacoes,
      posicoes: linhas.posicoes,
      questionarios: linhas.questionarios,
    },
    hoje
  );
  const certs = certificados(linhas, painel);
  const assistidas = [...linhas.assistidas].sort(
    (a, b) => a.assistidaEm.getTime() - b.assistidaEm.getTime()
  );
  const trocas = trocasDe(linhas.lancamentos);
  const itens = itensDosCursos(linhas, painel);
  return {
    certificados: [...certs.emitidos, ...certs.porGanhar],
    hoje,
    marcos: [
      ...METAS_DE_AULAS.map((meta) => metaDeAulas(assistidas, meta)),
      sequencia(linhas.lancamentos, assistidas, hoje),
    ],
    medalhas: [
      primeiraAula(assistidas, painel.retomada),
      primeiraTroca(trocas, linhas.vitrine),
      primeiroCurso(certs.emitidos, itens),
      contagem(
        "tres_trocas",
        trocas.map((t) => t.criadoEm),
        META_DE_TROCAS
      ),
      amostraETroca(linhas, trocas, painel),
      trocaAteOFim(linhas, trocas, itens),
      primeiroQuestionario(linhas.questionarios),
      notaCheia(linhas.questionarios),
      contagem(
        "tres_cursos",
        linhas.certificados.map((c) => c.emitidoEm),
        META_DE_CURSOS
      ),
      milPontos(linhas.estudoPorDia),
    ],
  };
}
