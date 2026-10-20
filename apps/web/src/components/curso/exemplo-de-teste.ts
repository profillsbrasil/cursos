import type { MaterialDaPagina } from "@cursos/api/dominio/material";
import type {
  AulaDaPagina,
  ModuloDaPagina,
  PaginaDoCurso,
} from "@cursos/api/dominio/pagina-do-curso";
import type { MarcaDoQuestionario } from "@cursos/api/dominio/questionario";
import type { AulaId, DiaISO, MaterialId } from "@cursos/api/dominio/tipos";

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}` as AulaId;

const aula = (
  n: number,
  titulo: string,
  duracaoSeg: number,
  descricao = ""
): AulaDaPagina => ({
  assistida: false,
  descricao,
  duracaoSeg,
  id: id(n),
  questionario: { tipo: "sem" },
  titulo,
});

export const RISCOS = id(11);
export const BLOQUEIO = id(12);
export const ESTRUTURA = id(21);
export const ESQUEMA = id(31);

const FABRICA: PaginaDoCurso = {
  acao: {
    aulaId: RISCOS,
    href: `/cursos/fabrica-e-montagem/aulas/${RISCOS}`,
    onde: { aula: 1, modulo: { numero: 1, titulo: "Segurança do posto" } },
    tipo: "comecar",
  },
  capa: {
    alt: "Montador na bancada",
    altura: 604,
    largura: 900,
    url: "/capa-fabrica.png",
  },
  categoria: "Produção e montagem",
  descricao:
    "O primeiro curso de quem chega à montagem da Profills.\n\nNo último módulo, você lê um esquema pneumático.",
  estado: { primeiraAula: RISCOS, tipo: "nao_iniciado" },
  materiais: [],
  modulos: [
    {
      aulas: [
        aula(
          11,
          "Riscos do posto de montagem",
          660,
          "Os pontos de esmagamento, corte e choque que aparecem na bancada."
        ),
        aula(12, "Bloqueio antes de mexer", 600),
      ],
      nivel: null,
      numero: 1,
      titulo: "Segurança do posto",
    },
    {
      aulas: [aula(21, "Estrutura e conjuntos", 540)],
      nivel: null,
      numero: 2,
      titulo: "Envasadora",
    },
    {
      aulas: [aula(31, "Leitura do esquema", 720)],
      nivel: null,
      numero: 3,
      titulo: "Montagem pneumática",
    },
  ],
  niveis: [],
  progresso: { feitas: 0, pct: 0, total: 4 },
  proximoNivel: null,
  slug: "fabrica-e-montagem",
  titulo: "Fábrica e montagem",
  topicos: [
    "Reconhecer os riscos do posto de montagem",
    "Ler um esquema pneumático",
  ],
};

export const AUTO_1 = id(101);
export const AUTO_2 = id(102);
export const HISTORIA = id(111);
export const URGENCIA_1 = id(121);
export const CRONOGRAMA = id(122);
export const URGENCIA_3 = id(123);
export const CONFIANCA = id(131);

const material = (
  n: number,
  titulo: string,
  tipo: MaterialDaPagina["tipo"],
  bytes: number
): MaterialDaPagina => {
  const idDoMaterial =
    `00000000-0000-4000-9000-${String(n).padStart(12, "0")}` as MaterialId;
  return {
    bytes,
    href: `/material/${idDoMaterial}`,
    id: idDoMaterial,
    nomeDoArquivo: `${titulo.toLowerCase().replaceAll(" ", "-")}.${tipo}`,
    tipo,
    titulo,
  };
};

/** Quatro arquivos, como no protótipo: o cartão mostra 3 e o "Ver todos (4)". */
export const MATERIAIS_DO_COMERCIAL: readonly MaterialDaPagina[] = [
  material(1, "Checklist da visita técnica", "pdf", 1_258_291),
  material(2, "Planilha do cronograma reverso", "xlsx", 88_064),
  material(3, "Manual do método comercial, revisão 7", "pdf", 15_518_924),
  material(4, "Slides do curso", "pptx", 6_606_029),
];

const VENDEDOR = { nome: "Vendedor Profills Certificado", ordem: 1 };
const CONSULTOR = { nome: "Consultor Comercial Profills", ordem: 2 };

const COMERCIAL: PaginaDoCurso = {
  acao: {
    aulaId: AUTO_1,
    href: `/cursos/comercial/aulas/${AUTO_1}`,
    onde: { aula: 1, modulo: { numero: 0, titulo: "Autoavaliação comercial" } },
    tipo: "comecar",
  },
  capa: { alt: "Aperto de mão", altura: 604, largura: 900, url: "/capa.png" },
  categoria: "Vendas e negócios",
  descricao:
    "O método comercial da Profills, do primeiro contato ao pós-venda.",
  estado: { primeiraAula: AUTO_1, tipo: "nao_iniciado" },
  materiais: [],
  modulos: [
    {
      aulas: [
        aula(101, "Autoavaliação, parte 1", 600),
        aula(102, "Autoavaliação, parte 2", 660),
      ],
      nivel: VENDEDOR,
      numero: 0,
      titulo: "Autoavaliação comercial",
    },
    {
      aulas: [aula(111, "História da Profills", 720)],
      nivel: VENDEDOR,
      numero: 1,
      titulo: "História e posicionamento",
    },
    {
      aulas: [
        aula(121, "Urgência não se cria, se descobre", 600),
        aula(
          122,
          "Cronograma reverso",
          660,
          "Partir da data em que a linha precisa rodar e voltar até o pedido."
        ),
        aula(123, "Datas que não fecham", 540),
      ],
      nivel: CONSULTOR,
      numero: 2,
      titulo: "Pilar Urgência",
    },
    {
      aulas: [aula(131, "Confiança na visita", 600)],
      nivel: CONSULTOR,
      numero: 3,
      titulo: "Pilar Confiança",
    },
  ],
  niveis: [VENDEDOR, CONSULTOR],
  progresso: { feitas: 0, pct: 0, total: 7 },
  proximoNivel: VENDEDOR,
  slug: "comercial",
  titulo: "Método comercial",
  topicos: ["Qualificar uma oportunidade", "Usar os cinco pilares"],
};

const assistidas = (p: PaginaDoCurso, ids: readonly AulaId[]) =>
  p.modulos.map((m) => ({
    ...m,
    aulas: m.aulas.map((a) => ({ ...a, assistida: ids.includes(a.id) })),
  }));

const comQuestionarios = (
  modulos: readonly ModuloDaPagina[],
  marcas: Readonly<Record<string, MarcaDoQuestionario>>
) =>
  modulos.map((m) => ({
    ...m,
    aulas: m.aulas.map((a) => ({
      ...a,
      questionario: marcas[a.id] ?? a.questionario,
    })),
  }));

const TODAS_FABRICA = [RISCOS, BLOQUEIO, ESTRUTURA, ESQUEMA];
const TODAS_COMERCIAL = [
  AUTO_1,
  AUTO_2,
  HISTORIA,
  URGENCIA_1,
  CRONOGRAMA,
  URGENCIA_3,
  CONFIANCA,
];

export const fabrica = {
  concluido: {
    ...FABRICA,
    acao: {
      aulaId: RISCOS,
      href: `/cursos/fabrica-e-montagem/aulas/${RISCOS}`,
      tipo: "rever",
    },
    estado: {
      certificado: {
        codigo: "CERT-FAB-1",
        emitidoEm: "2026-10-08T12:00:00.000Z",
      },
      tipo: "concluido",
    },
    modulos: assistidas(FABRICA, TODAS_FABRICA),
    progresso: { feitas: 4, pct: 100, total: 4 },
  },
  emAndamento: {
    ...FABRICA,
    acao: {
      aulaId: BLOQUEIO,
      href: `/cursos/fabrica-e-montagem/aulas/${BLOQUEIO}`,
      onde: { aula: 2, modulo: { numero: 1, titulo: "Segurança do posto" } },
      posicaoSeg: 222,
      tipo: "continuar",
    },
    estado: { proximaAula: BLOQUEIO, tipo: "em_andamento" },
    modulos: assistidas(FABRICA, [RISCOS]),
    progresso: { feitas: 1, pct: 25, total: 4 },
  },
  naoIniciado: FABRICA,
  /** Tudo assistido; o questionário de Riscos aprovado, o de Bloqueio reprovado (2 de 3), o de Estrutura por fazer; Esquema sem questionário. */
  questionarios: {
    ...FABRICA,
    acao: {
      aulaId: BLOQUEIO,
      href: `/cursos/fabrica-e-montagem/aulas/${BLOQUEIO}#questionario`,
      onde: { aula: 2, modulo: { numero: 1, titulo: "Segurança do posto" } },
      questionarios: { feitas: 1, pct: 33, total: 3 },
      tipo: "questionario",
      ultima: { acertos: 2, total: 3 },
    },
    estado: {
      aprovados: 1,
      proximaAula: BLOQUEIO,
      tipo: "questionarios",
      total: 3,
    },
    modulos: comQuestionarios(assistidas(FABRICA, TODAS_FABRICA), {
      [RISCOS]: { tipo: "aprovado" },
      [BLOQUEIO]: { tipo: "reprovado", ultima: { acertos: 2, total: 3 } },
      [ESTRUTURA]: { tipo: "a_fazer" },
    }),
    progresso: { feitas: 4, pct: 100, total: 4 },
  },
} satisfies Record<string, PaginaDoCurso>;

export const comercial = {
  concluido: {
    ...COMERCIAL,
    acao: {
      aulaId: AUTO_1,
      href: `/cursos/comercial/aulas/${AUTO_1}`,
      tipo: "rever",
    },
    estado: {
      certificado: {
        codigo: "CERT-COM-7",
        emitidoEm: "2025-12-29T02:00:00.000Z",
      },
      tipo: "concluido",
    },
    modulos: assistidas(COMERCIAL, TODAS_COMERCIAL),
    progresso: { feitas: 7, pct: 100, total: 7 },
    proximoNivel: null,
  },
  emAndamento: {
    ...COMERCIAL,
    acao: {
      aulaId: CRONOGRAMA,
      href: `/cursos/comercial/aulas/${CRONOGRAMA}`,
      onde: { aula: 2, modulo: { numero: 2, titulo: "Pilar Urgência" } },
      posicaoSeg: 0,
      tipo: "continuar",
    },
    estado: { proximaAula: CRONOGRAMA, tipo: "em_andamento" },
    modulos: assistidas(COMERCIAL, [AUTO_1, AUTO_2, HISTORIA, URGENCIA_1]),
    progresso: { feitas: 4, pct: 57, total: 7 },
    proximoNivel: CONSULTOR,
  },
  naoIniciado: COMERCIAL,
  /** Tudo assistido e um questionário por aula; só o de Cronograma reverso falta, sem tentativa. */
  questionarios: {
    ...COMERCIAL,
    acao: {
      aulaId: CRONOGRAMA,
      href: `/cursos/comercial/aulas/${CRONOGRAMA}#questionario`,
      onde: { aula: 2, modulo: { numero: 2, titulo: "Pilar Urgência" } },
      questionarios: { feitas: 6, pct: 85, total: 7 },
      tipo: "questionario",
      ultima: null,
    },
    estado: {
      aprovados: 6,
      proximaAula: CRONOGRAMA,
      tipo: "questionarios",
      total: 7,
    },
    modulos: comQuestionarios(
      assistidas(COMERCIAL, TODAS_COMERCIAL),
      Object.fromEntries(
        TODAS_COMERCIAL.map((a) => [
          a,
          a === CRONOGRAMA ? { tipo: "a_fazer" } : { tipo: "aprovado" },
        ])
      )
    ),
    progresso: { feitas: 7, pct: 100, total: 7 },
    proximoNivel: null,
  },
} satisfies Record<string, PaginaDoCurso>;

export const HOJE = "2026-10-15" as DiaISO;
