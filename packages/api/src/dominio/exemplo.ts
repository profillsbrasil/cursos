import {
  CERTIFICADO_A,
  COMUNICADO,
  CURSOS,
  codigoCertificado,
  LIBERADOS_A,
  POSICAO_A,
  PROGRESSO_A,
  VIDEO_EXEMPLO,
} from "@cursos/db/seed/dados";

import type {
  AulaDoDocumento,
  DocumentoDoCurso,
  PerguntaDoDocumento,
} from "./edicao-do-curso";
import {
  alternativaId,
  aulaId,
  categoriaId,
  cursoId,
  diaISO,
  moduloId,
  perguntaId,
} from "./marcas";
import type { CursoLinha, LinhasPainel } from "./painel";
import {
  type AlternativaId,
  type AulaId,
  type CursoCatalogo,
  capaDe,
  type EstudoDoQuestionario,
  type Historico,
  type PerguntaId,
  type StatusDoCurso,
  type Versao,
} from "./tipos";

/** Uuid com letra, para o teste ver a caixa. */
export const uuidDeExemplo = (n: number) =>
  `0a0b0c0d-0000-4000-8000-${String(n).padStart(12, "0")}`;

export const EDICAO = {
  A1: aulaId(uuidDeExemplo(21)),
  A2: aulaId(uuidDeExemplo(22)),
  A3: aulaId(uuidDeExemplo(23)),
  CATEGORIA: categoriaId(uuidDeExemplo(31)),
  CURSO: cursoId(uuidDeExemplo(1)),
  M1: moduloId(uuidDeExemplo(11)),
  M2: moduloId(uuidDeExemplo(12)),
  P1: perguntaId(uuidDeExemplo(41)),
  P1A: alternativaId(uuidDeExemplo(51)),
  P1B: alternativaId(uuidDeExemplo(52)),
} as const;

export const aulaDeExemplo = (id: AulaId, titulo: string): AulaDoDocumento => ({
  descricao: "",
  duracaoSeg: 300,
  id,
  perguntas: [],
  titulo,
  video: null,
});

export const perguntaDeExemplo = (
  id: PerguntaId,
  alternativas: readonly [AlternativaId, AlternativaId],
  enunciado = "Qual é a pergunta?"
): PerguntaDoDocumento => ({
  alternativas: [
    { certa: false, id: alternativas[0], texto: "Errada" },
    { certa: true, id: alternativas[1], texto: "Certa" },
  ],
  enunciado,
  id,
});

/** Dois módulos (0: A1, A2; 1: A3), dois níveis, na forma canônica do schema. */
export function documentoDeExemplo(
  versao: Versao | null = null
): DocumentoDoCurso {
  return {
    categoriaId: EDICAO.CATEGORIA,
    descricao: "",
    id: EDICAO.CURSO,
    materiais: [],
    modulos: [
      {
        aulas: [
          aulaDeExemplo(EDICAO.A1, "Aula 1"),
          aulaDeExemplo(EDICAO.A2, "Aula 2"),
        ],
        id: EDICAO.M1,
        nivelOrdem: 1,
        numero: 0,
        titulo: "Módulo zero",
      },
      {
        aulas: [aulaDeExemplo(EDICAO.A3, "Aula 3")],
        id: EDICAO.M2,
        nivelOrdem: 2,
        numero: 1,
        titulo: "Módulo um",
      },
    ],
    niveis: [
      { nome: "Básico", ordem: 1 },
      { nome: "Avançado", ordem: 2 },
    ],
    precoTroca: null,
    status: "publicado",
    titulo: "Curso",
    topicos: [],
    versao,
  };
}

export const idAula = (curso: string, modulo: number, posicao: number) =>
  aulaId(`${curso}-m${modulo}-a${posicao}`);

interface OpcoesCurso {
  /** Aulas por módulo, módulos numerados a partir de `primeiroNumero`. */
  aulas: number[];
  /** Duração de cada aula em segundos. */
  duracaoSeg?: number;
  niveis?: { nome: string; ordem: number }[];
  /** Nível de cada módulo, na mesma ordem de `aulas`. */
  nivelPorModulo?: (number | null)[];
  /** Perguntas em cada aula; sem a opção, nenhuma aula tem questionário. */
  perguntas?: number;
  primeiroNumero?: number;
  status?: StatusDoCurso;
}

export function cursoLinha(chave: string, o: OpcoesCurso): CursoLinha {
  const primeiro = o.primeiroNumero ?? 0;

  return {
    capaAlt: `Capa de ${chave}`,
    capaAltura: 720,
    capaLargura: 1280,
    capaUrl: `/capas/${chave}.jpg`,
    categoria: { nome: "Categoria" },
    codigo: "CAT-001",
    descricao: "",
    id: cursoId(chave),
    modulos: o.aulas.map((qtd, i) => ({
      aulas: Array.from({ length: qtd }, (_, p) => ({
        descricao: "",
        duracaoSeg: o.duracaoSeg ?? 600,
        id: idAula(chave, primeiro + i, p + 1),
        perguntas: o.perguntas ?? 0,
        posicao: p + 1,
        titulo: `Aula ${p + 1} de ${chave}`,
        videoId: null,
        videoProvedor: null,
      })),
      nivelOrdem: o.nivelPorModulo?.[i] ?? null,
      numero: primeiro + i,
      titulo: `Módulo ${primeiro + i} de ${chave}`,
    })),
    niveis: o.niveis ?? [],
    slug: chave,
    status: o.status ?? "publicado",
    titulo: `Curso ${chave}`,
    topicos: [],
  };
}

/** CursoCatalogo direto, sem passar por paraCatalogo. */
export function cursoCat(chave: string, o: OpcoesCurso): CursoCatalogo {
  const l = cursoLinha(chave, o);

  return {
    capa: capaDe(l),
    categoria: l.categoria.nome,
    codigo: l.codigo,
    descricao: l.descricao,
    id: l.id,
    modulos: l.modulos.map((m) => ({
      ...m,
      aulas: m.aulas.map((a) => ({
        descricao: a.descricao,
        duracaoSeg: a.duracaoSeg,
        id: a.id,
        perguntas: a.perguntas,
        posicao: a.posicao,
        titulo: a.titulo,
        video: null,
      })),
    })),
    niveis: l.niveis,
    slug: l.slug,
    status: l.status,
    titulo: l.titulo,
    topicos: l.topicos,
  };
}

/** Aprovado, ou reprovado com a nota da última tentativa. */
export const questionario = (
  aprovada: boolean,
  ultima = aprovada ? { acertos: 3, total: 3 } : { acertos: 1, total: 3 }
): EstudoDoQuestionario => ({ aprovada, tentativas: 1, ultima });

export function historico(o: {
  assistidas?: string[];
  certificados?: string[];
  posicoes?: [string, number, string?][];
  questionarios?: [string, EstudoDoQuestionario][];
}): Historico {
  return {
    assistidas: new Set((o.assistidas ?? []).map((a) => aulaId(a))),
    certificados: new Map(
      (o.certificados ?? []).map((c) => [
        cursoId(c),
        { codigo: `CERT-${c}`, emitidoEm: "2026-09-01T12:00:00.000Z" },
      ])
    ),
    posicoes: new Map(
      (o.posicoes ?? []).map(([aula, seg, quando]) => [
        aulaId(aula),
        { atualizadaEm: quando ?? "2026-10-07T12:00:00.000Z", posicaoSeg: seg },
      ])
    ),
    questionarios: new Map(
      (o.questionarios ?? []).map(([aula, q]) => [aulaId(aula), q])
    ),
  };
}

/** Todas as aulas de um curso de cursoLinha, em ordem. */
export const aulasDe = (l: CursoLinha) =>
  l.modulos.flatMap((m) => m.aulas.map((a) => a.id));

function linhaDoSeed(chave: string): CursoLinha {
  const c = CURSOS.find((x) => x.chave === chave);

  if (!c) {
    throw new Error(`curso ${chave} não está no seed`);
  }

  return {
    capaAlt: c.capaAlt,
    capaAltura: c.capaAltura,
    capaLargura: c.capaLargura,
    capaUrl: c.capaUrl,
    categoria: { nome: c.categoria },
    codigo: c.codigo,
    descricao: c.descricao,
    id: cursoId(chave),
    modulos: c.modulos.map((m) => ({
      aulas: m.aulas.map((a, i) => ({
        descricao: a.descricao ?? "",
        duracaoSeg: VIDEO_EXEMPLO.duracaoSeg,
        id: idAula(chave, m.numero, i + 1),
        perguntas: 0,
        posicao: i + 1,
        titulo: a.titulo,
        videoId: VIDEO_EXEMPLO.id,
        videoProvedor: VIDEO_EXEMPLO.provedor,
      })),
      nivelOrdem: m.nivelOrdem,
      numero: m.numero,
      titulo: m.titulo,
    })),
    niveis: c.niveis,
    slug: chave,
    status: c.status,
    titulo: c.titulo,
    topicos: c.topicos,
  };
}

const em = (iso: string) => new Date(iso);

export function exemploDoPrototipo(): LinhasPainel {
  const liberacoes = LIBERADOS_A.map((chave, i) => ({
    amostra: null,
    curso: linhaDoSeed(chave),
    liberadaEm: new Date(Date.UTC(2026, 7, 1 + i, 12)),
  }));

  const assistidas = PROGRESSO_A.flatMap((p) => {
    const linha = linhaDoSeed(p.curso);
    const m = linha.modulos.find((x) => x.numero === p.modulo);

    return (m?.aulas ?? []).slice(0, Math.min(p.aulas, m?.aulas.length ?? 0));
  }).map((a, i) => ({
    assistidaEm: em(
      `2026-09-${String(1 + (i % 28)).padStart(2, "0")}T15:00:00Z`
    ),
    aulaId: a.id,
  }));

  return {
    assistidas,
    certificados: [
      {
        codigo: codigoCertificado("user_seedA"),
        cursoId: cursoId(CERTIFICADO_A.curso),
        emitidoEm: em("2026-09-20T12:00:00Z"),
      },
    ],
    comunicados: [
      {
        cursoId: null,
        id: "comunicado-1",
        publicadoEm: em("2026-10-02T12:00:00Z"),
        texto: COMUNICADO.texto,
        titulo: COMUNICADO.titulo,
      },
    ],
    liberacoes,
    posicoes: [
      {
        atualizadaEm: em("2026-10-07T13:00:00Z"),
        aulaId: idAula(POSICAO_A.curso, POSICAO_A.modulo, POSICAO_A.aula),
        posicaoSeg: POSICAO_A.posicaoSeg,
      },
    ],
    questionarios: [],
  };
}

/** O dia, em São Paulo, em que os testes montam o painel: a semana das posições do exemplo. */
export const HOJE_DO_EXEMPLO = diaISO("2026-10-08");

export const SEM_LIBERACAO: LinhasPainel = {
  assistidas: [],
  certificados: [],
  comunicados: [],
  liberacoes: [],
  posicoes: [],
  questionarios: [],
};
