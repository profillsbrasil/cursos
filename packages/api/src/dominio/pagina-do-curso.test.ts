import { describe, expect, test } from "bun:test";

import { type LinhasCurso, montarCursoAberto } from "./aula";
import { cursoLinha, idAula } from "./exemplo";
import { montarPaginaDoCurso } from "./pagina-do-curso";
import type { CursoLinha } from "./painel";
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
    categoria: "Processo de envase",
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
  });
  return aberto && montarPaginaDoCurso(aberto);
};

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
              titulo: "Aula 1 de envase",
            },
            {
              assistida: false,
              descricao: "",
              duracaoSeg: 600,
              id: A2,
              titulo: "Aula 2 de envase",
            },
          ],
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
              titulo: "Aula 1 de envase",
            },
          ],
          numero: 2,
          titulo: "Módulo 2 de envase",
        },
      ],
      progresso: { feitas: 1, pct: 33, total: 3 },
      titulo: "Curso envase",
      topicos: ["Ligar a máquina", "Dosar o volume"],
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

  test("com todas as aulas assistidas, a ação é a prova, na página do curso", () => {
    const p = pagina({ assistidas: [A1, A2, B1].map(assistida) });
    expect([p?.estado.tipo, p?.acao]).toEqual([
      "prova",
      { href: "/cursos/envase", tipo: "prova" },
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
});
