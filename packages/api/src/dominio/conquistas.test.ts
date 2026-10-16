import { describe, expect, test } from "bun:test";

import {
  type Conquistas,
  type LinhasDasConquistas,
  montarConquistas,
} from "./conquistas";
import { cursoLinha, idAula } from "./exemplo";
import type { CursoId, DiaISO } from "./tipos";
import type { CursoDaTroca } from "./troca";

const SEXTA = "2026-10-16" as DiaISO;
const SABADO = "2026-10-17" as DiaISO;

const AUTO = cursoLinha("auto", { aulas: [2] });
const COMERCIAL = cursoLinha("comercial", { aulas: [3, 3] });
const FABRICA = cursoLinha("fabrica", { aulas: [7] });
const GRAVACAO = cursoLinha("gravacao", { aulas: [3], status: "em_producao" });
const REVOGADO = cursoLinha("revogado", { aulas: [1] });

const liberado = (curso: typeof AUTO, dia: number) => ({
  curso,
  liberadaEm: new Date(Date.UTC(2026, 7, dia, 12)),
});

const assistida = (curso: typeof AUTO, posicao: number, iso: string) => ({
  assistidaEm: new Date(iso),
  aula: `Aula ${posicao} de ${curso.id}`,
  aulaId: idAula(curso.id, 0, posicao),
  curso: curso.titulo,
});

const capa = (curso: typeof AUTO) => ({
  capaAlt: curso.capaAlt,
  capaAltura: curso.capaAltura,
  capaLargura: curso.capaLargura,
  capaUrl: curso.capaUrl,
  slug: curso.slug,
  titulo: curso.titulo,
});

const vitrine = (preco: number, titulo: string): CursoDaTroca => ({
  acesso: { tipo: "nenhum" },
  aulas: 3,
  capa: { alt: "Capa", altura: 720, largura: 1280, url: "/capas/x.jpg" },
  categoria: "Processo de envase",
  duracaoSeg: 1800,
  id: `v-${preco}` as CursoId,
  precoTroca: preco,
  slug: `v-${preco}`,
  status: "publicado",
  titulo,
});

const NADA: LinhasDasConquistas = {
  assistidas: [],
  certificados: [],
  lancamentos: [],
  liberacoes: [],
  posicoes: [],
  questionarios: [],
  vitrine: [],
};

const ALUNA: LinhasDasConquistas = {
  assistidas: [
    assistida(AUTO, 2, "2026-08-18T20:00:00Z"),
    assistida(AUTO, 1, "2026-08-18T14:00:00Z"),
    assistida(COMERCIAL, 1, "2026-09-03T14:00:00Z"),
    assistida(REVOGADO, 1, "2026-09-04T14:00:00Z"),
  ],
  certificados: [
    {
      codigo: "PS-REV-2026-AAAAAA",
      curso: capa(REVOGADO),
      cursoId: REVOGADO.id,
      emitidoEm: new Date("2026-09-10T12:00:00Z"),
      segundosDeVideo: 0,
    },
    {
      codigo: "PS-M0-2026-3F9A1C",
      curso: capa(AUTO),
      cursoId: AUTO.id,
      emitidoEm: new Date("2026-09-02T12:00:00Z"),
      segundosDeVideo: 3601,
    },
  ],
  lancamentos: [
    {
      criadoEm: new Date("2026-10-13T15:00:00Z"),
      curso: "Boas práticas de fabricação",
      motivo: "troca",
      pontos: -200,
    },
    {
      criadoEm: new Date("2026-10-09T15:00:00Z"),
      curso: null,
      motivo: "sequencia_7_dias",
      pontos: 30,
    },
    {
      criadoEm: new Date("2026-09-25T15:00:00Z"),
      curso: null,
      motivo: "sequencia_7_dias",
      pontos: 30,
    },
  ],
  liberacoes: [
    liberado(AUTO, 1),
    liberado(FABRICA, 2),
    liberado(COMERCIAL, 3),
    liberado(GRAVACAO, 4),
  ],
  posicoes: [],
  questionarios: [],
  vitrine: [vitrine(500, "Portfólio")],
};

const marco = (c: Conquistas, tipo: string, meta?: number) =>
  c.marcos.find(
    (m) =>
      m.tipo === tipo &&
      (meta === undefined || ("meta" in m && m.meta === meta))
  )?.medalha;

describe("montarConquistas", () => {
  const aluna = montarConquistas(ALUNA, SEXTA);

  test("os marcos saem sempre na mesma ordem", () => {
    expect(
      aluna.marcos.map((m) => (m.tipo === "aulas" ? `aulas ${m.meta}` : m.tipo))
    ).toEqual([
      "primeira_aula",
      "aulas 10",
      "aulas 50",
      "aulas 100",
      "sequencia",
      "primeira_troca",
      "primeiro_curso",
    ]);
  });

  test("a primeira aula é a mais antiga, com o dia de São Paulo e os títulos", () => {
    expect(marco(aluna, "primeira_aula")).toEqual({
      aula: "Aula 1 de auto",
      curso: "Curso auto",
      dia: "2026-08-18" as DiaISO,
      estado: "ganha",
    });
  });

  test("as metas de aulas contam toda aula assistida, também de curso revogado", () => {
    expect(marco(aluna, "aulas", 10)).toEqual({
      estado: "por_ganhar",
      feitas: 4,
    });
  });

  test("a sequência ganha leva o dia da primeira vez e quantas vezes", () => {
    expect(marco(aluna, "sequencia")).toEqual({
      dia: "2026-09-25" as DiaISO,
      estado: "ganha",
      vezes: 2,
    });
  });

  test("a primeira troca leva o curso e os pontos pagos", () => {
    expect(marco(aluna, "primeira_troca")).toEqual({
      curso: "Boas práticas de fabricação",
      dia: "2026-10-13" as DiaISO,
      estado: "ganha",
      pontos: 200,
    });
  });

  test("o primeiro curso concluído é o certificado mais antigo", () => {
    expect(marco(aluna, "primeiro_curso")).toEqual({
      curso: "Curso auto",
      dia: "2026-09-02" as DiaISO,
      estado: "ganha",
    });
  });

  test("certificados: os emitidos pela data, o do curso revogado fica, e os por ganhar sem o curso em produção", () => {
    expect(
      aluna.certificados.map((c) =>
        c.estado === "ganha"
          ? [c.curso.titulo, c.dia, c.codigo]
          : [c.curso.titulo, c.feitas, c.total]
      )
    ).toEqual([
      ["Curso auto", "2026-09-02", "PS-M0-2026-3F9A1C"],
      ["Curso revogado", "2026-09-10", "PS-REV-2026-AAAAAA"],
      ["Curso comercial", 1, 6],
      ["Curso fabrica", 0, 7],
    ]);
  });

  test("cada certificado leva o endereço do curso; o emitido, as horas da folha; o por ganhar, a categoria", () => {
    expect(
      aluna.certificados.map((c) =>
        c.estado === "ganha"
          ? [c.curso.slug, c.horas]
          : [c.curso.slug, c.categoria]
      )
    ).toEqual([
      [AUTO.slug, 2],
      [REVOGADO.slug, 0],
      [COMERCIAL.slug, COMERCIAL.categoria.nome],
      [FABRICA.slug, FABRICA.categoria.nome],
    ]);
  });

  test("a décima aula dá a medalha de 10 aulas no dia dela", () => {
    const dez = Array.from({ length: 10 }, (_, i) =>
      assistida(
        COMERCIAL,
        i + 1,
        `2026-10-${String(1 + i).padStart(2, "0")}T14:00:00Z`
      )
    );
    const c = montarConquistas({ ...NADA, assistidas: dez }, SEXTA);
    expect(marco(c, "aulas", 10)).toEqual({
      dia: "2026-10-10" as DiaISO,
      estado: "ganha",
    });
    expect(marco(c, "aulas", 50)).toEqual({ estado: "por_ganhar", feitas: 10 });
  });
});

describe("montarConquistas para o aluno novo", () => {
  const novo = montarConquistas(
    {
      ...NADA,
      liberacoes: [liberado(FABRICA, 1)],
      vitrine: [vitrine(500, "Portfólio"), vitrine(200, "BPF")],
    },
    SEXTA
  );

  test("a primeira aula aponta a aula de começar", () => {
    expect(marco(novo, "primeira_aula")).toEqual({
      estado: "por_ganhar",
      proxima: {
        aula: "Aula 1 de fabrica",
        curso: "Curso fabrica",
        tipo: "comecar",
      },
    });
  });

  test("a sequência começa do zero, com hoje ainda pendente", () => {
    expect(marco(novo, "sequencia")).toEqual({
      dias: 0,
      estado: "por_ganhar",
      hojePendente: true,
      meta: 7,
    });
  });

  test("a troca diz o preço do curso trocável mais barato", () => {
    expect(marco(novo, "primeira_troca")).toEqual({
      estado: "por_ganhar",
      maisBarato: 200,
      pontosPorAula: 10,
    });
  });

  test("o primeiro curso aponta o curso a que faltam menos aulas", () => {
    expect(marco(novo, "primeiro_curso")).toEqual({
      estado: "por_ganhar",
      maisPerto: { curso: "Curso fabrica", feitas: 0, total: 7 },
    });
    expect(novo.certificados).toHaveLength(1);
  });

  test("sem liberação e sem vitrine, nada a apontar", () => {
    const vazio = montarConquistas(NADA, SEXTA);
    expect(marco(vazio, "primeira_aula")).toEqual({
      estado: "por_ganhar",
      proxima: null,
    });
    expect(marco(vazio, "primeira_troca")).toEqual({
      estado: "por_ganhar",
      maisBarato: null,
      pontosPorAula: 10,
    });
    expect(marco(vazio, "primeiro_curso")).toEqual({
      estado: "por_ganhar",
      maisPerto: null,
    });
    expect(vazio.certificados).toEqual([]);
  });
});

describe("a sequência por ganhar", () => {
  const tresDias = ["2026-10-13", "2026-10-14", "2026-10-15"].map((dia) => ({
    assistidaEm: new Date(`${dia}T14:00:00Z`),
    aula: "Aula",
    aulaId: `aula-${dia}`,
    curso: "Curso",
  }));

  test("três dias úteis e hoje sem aula", () => {
    expect(
      marco(
        montarConquistas({ ...NADA, assistidas: tresDias }, SEXTA),
        "sequencia"
      )
    ).toMatchObject({ dias: 3, hojePendente: true });
  });

  test("no sábado, hoje não fica pendente", () => {
    const comSexta = [
      ...tresDias,
      {
        assistidaEm: new Date("2026-10-16T14:00:00Z"),
        aula: "Aula",
        aulaId: "sexta",
        curso: "Curso",
      },
    ];
    expect(
      marco(
        montarConquistas({ ...NADA, assistidas: comSexta }, SABADO),
        "sequencia"
      )
    ).toMatchObject({ dias: 4, hojePendente: false });
  });
});

test("a troca sem o curso é um erro do banco, não uma medalha vazia", () => {
  expect(() =>
    montarConquistas(
      {
        ...NADA,
        lancamentos: [
          { criadoEm: new Date(), curso: null, motivo: "troca", pontos: -200 },
        ],
      },
      SEXTA
    )
  ).toThrow("Lançamento de troca sem o curso da liberação.");
});
