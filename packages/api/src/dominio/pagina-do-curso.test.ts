import { describe, expect, test } from "bun:test";

import { type LinhasCurso, montarCursoAberto } from "./aula";
import { cursoLinha, idAula } from "./exemplo";
import { montarPaginaDoCurso } from "./pagina-do-curso";
import type { CursoLinha } from "./painel";
import type { MarcaDoQuestionario } from "./questionario";
import type { AulaId } from "./tipos";

const em = (iso: string) => new Date(iso);

/** Dois módulos (1: duas aulas, 2: uma), com descrição, tópicos e a descrição da 1.ª aula. */
function linha(): CursoLinha {
  const base = cursoLinha("envase", { aulas: [2, 1], primeiroNumero: 1 });
  const [m1, m2] = base.modulos;
  if (!(m1 && m2)) {
    throw new Error("o exemplo tem dois módulos");
  }
  return {
    ...base,
    categoria: { nome: "Processo de envase" },
    descricao: "Como envasar líquidos.",
    modulos: [
      {
        ...m1,
        aulas: m1.aulas.map((a, i) =>
          i === 0 ? { ...a, descricao: "Liga a máquina." } : a
        ),
      },
      m2,
    ],
    topicos: ["Ligar a máquina", "Dosar o volume"],
  };
}

const A1 = idAula("envase", 1, 1) as AulaId;
const A2 = idAula("envase", 1, 2) as AulaId;
const B1 = idAula("envase", 2, 1) as AulaId;

const pagina = (o: Partial<Omit<LinhasCurso, "curso">> = {}) => {
  const aberto = montarCursoAberto({
    assistidas: o.assistidas ?? [],
    certificados: o.certificados ?? [],
    curso: { ...linha(), liberacoes: [{ id: "lib" }] },
    posicoes: o.posicoes ?? [],
    questionarios: o.questionarios ?? [],
  });
  return aberto && montarPaginaDoCurso(aberto);
};

const SEM: MarcaDoQuestionario = { tipo: "sem" };

const assistida = (aulaId: string) => ({
  assistidaEm: em("2026-10-06T15:00:00Z"),
  aulaId,
  dia: "2026-10-06",
});

describe("montarPaginaDoCurso", () => {
  test("leva o que o curso ensina e as aulas por módulo, com a descrição e a assistida", () => {
    const p = pagina({ assistidas: [assistida(A1)] });
    expect({
      categoria: p?.categoria,
      descricao: p?.descricao,
      modulos: p?.modulos,
      progresso: p?.progresso,
      titulo: p?.titulo,
      topicos: p?.topicos,
    }).toEqual({
      categoria: "Processo de envase",
      descricao: "Como envasar líquidos.",
      modulos: [
        {
          aulas: [
            {
              assistida: true,
              descricao: "Liga a máquina.",
              duracaoSeg: 600,
              id: A1,
              questionario: SEM,
              titulo: "Aula 1 de envase",
            },
            {
              assistida: false,
              descricao: "",
              duracaoSeg: 600,
              id: A2,
              questionario: SEM,
              titulo: "Aula 2 de envase",
            },
          ],
          nivel: null,
          numero: 1,
          titulo: "Módulo 1 de envase",
        },
        {
          aulas: [
            {
              assistida: false,
              descricao: "",
              duracaoSeg: 600,
              id: B1,
              questionario: SEM,
              titulo: "Aula 1 de envase",
            },
          ],
          nivel: null,
          numero: 2,
          titulo: "Módulo 2 de envase",
        },
      ],
      progresso: { feitas: 1, pct: 33, total: 3 },
      titulo: "Curso envase",
      topicos: ["Ligar a máquina", "Dosar o volume"],
    });
  });

  test("sem níveis, a lista de níveis é vazia e não há próximo nível", () => {
    const p = pagina();
    expect([p?.niveis, p?.proximoNivel]).toEqual([[], null]);
  });

  test("com níveis, cada módulo leva o dele e o próximo é o primeiro ainda por terminar", () => {
    const base = linha();
    const [m1, m2] = base.modulos;
    if (!(m1 && m2)) {
      throw new Error("o exemplo tem dois módulos");
    }
    const aberto = montarCursoAberto({
      assistidas: [A1, A2].map(assistida),
      certificados: [],
      curso: {
        ...base,
        liberacoes: [{ id: "lib" }],
        modulos: [
          { ...m1, nivelOrdem: 1 },
          { ...m2, nivelOrdem: 2 },
        ],
        niveis: [
          { nome: "Operador", ordem: 1 },
          { nome: "Técnico", ordem: 2 },
        ],
      },
      posicoes: [],
      questionarios: [],
    });
    const p = aberto && montarPaginaDoCurso(aberto);
    expect({
      modulos: p?.modulos.map((m) => [m.numero, m.nivel]),
      niveis: p?.niveis,
      proximoNivel: p?.proximoNivel,
    }).toEqual({
      modulos: [
        [1, { nome: "Operador", ordem: 1 }],
        [2, { nome: "Técnico", ordem: 2 }],
      ],
      niveis: [
        { nome: "Operador", ordem: 1 },
        { nome: "Técnico", ordem: 2 },
      ],
      proximoNivel: { nome: "Técnico", ordem: 2 },
    });
  });

  test("sem estudo, a ação é começar pela primeira aula", () => {
    expect(pagina()?.acao).toEqual({
      aulaId: A1,
      href: `/cursos/envase/aulas/${A1}`,
      onde: { aula: 1, modulo: { numero: 1, titulo: "Módulo 1 de envase" } },
      tipo: "comecar",
    });
  });

  test("com posição salva, a ação continua na aula e no segundo em que a pessoa parou", () => {
    const p = pagina({
      assistidas: [assistida(A1)],
      posicoes: [
        {
          atualizadaEm: em("2026-10-07T13:00:00Z"),
          aulaId: A2,
          posicaoSeg: 222,
          trechosVistos: [],
        },
      ],
    });
    expect([p?.estado.tipo, p?.acao]).toEqual([
      "em_andamento",
      {
        aulaId: A2,
        href: `/cursos/envase/aulas/${A2}`,
        onde: { aula: 2, modulo: { numero: 1, titulo: "Módulo 1 de envase" } },
        posicaoSeg: 222,
        tipo: "continuar",
      },
    ]);
  });

  test("com todas as aulas assistidas e questionário por aprovar, a ação leva ao questionário reprovado, e cada aula diz o dela", () => {
    const base = linha();
    const comPerguntas: CursoLinha = {
      ...base,
      modulos: base.modulos.map((m) => ({
        ...m,
        aulas: m.aulas.map((a) => ({ ...a, perguntas: a.id === A1 ? 0 : 3 })),
      })),
    };
    const tentativa = (aulaId: string, aprovada: boolean, acertos: number) => ({
      aprovada,
      aulaId,
      tentativas: 1,
      ultimaEm: em("2026-10-06T16:00:00Z"),
      ultimosAcertos: acertos,
      ultimoTotal: 3,
    });
    const aberto = montarCursoAberto({
      assistidas: [A1, A2, B1].map(assistida),
      certificados: [],
      curso: { ...comPerguntas, liberacoes: [{ id: "lib" }] },
      posicoes: [],
      questionarios: [tentativa(B1, false, 2)],
    });
    const p = aberto && montarPaginaDoCurso(aberto);
    expect([p?.estado, p?.acao]).toEqual([
      { aprovados: 0, proximaAula: B1, tipo: "questionarios", total: 2 },
      {
        aulaId: B1,
        href: `/cursos/envase/aulas/${B1}#questionario`,
        onde: { aula: 1, modulo: { numero: 2, titulo: "Módulo 2 de envase" } },
        questionarios: { feitas: 0, pct: 0, total: 2 },
        tipo: "questionario",
        ultima: { acertos: 2, total: 3 },
      },
    ]);
    expect(
      p?.modulos.flatMap((m) => m.aulas.map((a) => a.questionario))
    ).toEqual([
      { tipo: "sem" },
      { tipo: "a_fazer" },
      { tipo: "reprovado", ultima: { acertos: 2, total: 3 } },
    ]);
  });

  test("com certificado, a ação é rever a primeira aula", () => {
    const p = pagina({
      assistidas: [A1, A2, B1].map(assistida),
      certificados: [
        {
          codigo: "CERT-1",
          cursoId: "envase",
          emitidoEm: em("2026-10-08T12:00:00Z"),
        },
      ],
    });
    expect([p?.estado.tipo, p?.acao]).toEqual([
      "concluido",
      { aulaId: A1, href: `/cursos/envase/aulas/${A1}`, tipo: "rever" },
    ]);
  });

  test("com certificado e um módulo vazio na frente, rever leva à primeira aula que existe", () => {
    const base = linha();
    const [m1] = base.modulos;
    if (!m1) {
      throw new Error("o exemplo tem dois módulos");
    }
    const aberto = montarCursoAberto({
      assistidas: [A1, A2, B1].map(assistida),
      certificados: [
        {
          codigo: "CERT-1",
          cursoId: "envase",
          emitidoEm: em("2026-10-08T12:00:00Z"),
        },
      ],
      curso: {
        ...base,
        liberacoes: [{ id: "lib" }],
        modulos: [{ ...m1, aulas: [], numero: 0 }, ...base.modulos],
      },
      posicoes: [],
      questionarios: [],
    });
    expect(aberto && montarPaginaDoCurso(aberto).acao).toEqual({
      aulaId: A1,
      href: `/cursos/envase/aulas/${A1}`,
      tipo: "rever",
    });
  });
});
