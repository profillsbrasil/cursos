import { describe, expect, test } from "bun:test";

import {
  type Conquistas,
  type LinhasDasConquistas,
  montarConquistas,
  porcentagemPorGanhar,
  type TentativasDaAula,
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
  amostra: null,
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
  estudoPorDia: [],
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
  estudoPorDia: [],
  lancamentos: [
    {
      criadoEm: new Date("2026-10-13T15:00:00Z"),
      cursoId: "bpf",
      motivo: "troca",
    },
    {
      criadoEm: new Date("2026-10-09T15:00:00Z"),
      cursoId: null,
      motivo: "sequencia_7_dias",
    },
    {
      criadoEm: new Date("2026-09-25T15:00:00Z"),
      cursoId: null,
      motivo: "sequencia_7_dias",
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
  [...c.marcos, ...c.medalhas].find(
    (m) =>
      m.tipo === tipo &&
      (meta === undefined || ("meta" in m && m.meta === meta))
  )?.medalha;

describe("montarConquistas", () => {
  const aluna = montarConquistas(ALUNA, SEXTA);

  test("os marcos e as medalhas da grade saem sempre na mesma ordem", () => {
    expect(
      aluna.marcos.map((m) => (m.tipo === "aulas" ? `aulas ${m.meta}` : m.tipo))
    ).toEqual(["aulas 10", "aulas 50", "aulas 100", "sequencia"]);
    expect(aluna.medalhas.map((m) => m.tipo)).toEqual([
      "primeira_aula",
      "primeira_troca",
      "primeiro_curso",
      "tres_trocas",
      "amostra_e_troca",
      "troca_ate_o_fim",
      "primeiro_questionario",
      "nota_cheia",
      "tres_cursos",
      "mil_pontos",
    ]);
  });

  test("a primeira aula é a mais antiga, com o dia de São Paulo", () => {
    expect(marco(aluna, "primeira_aula")).toEqual({
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

  test("a primeira troca leva o dia da troca", () => {
    expect(marco(aluna, "primeira_troca")).toEqual({
      dia: "2026-10-13" as DiaISO,
      estado: "ganha",
    });
  });

  test("o primeiro curso concluído é o certificado mais antigo", () => {
    expect(marco(aluna, "primeiro_curso")).toEqual({
      dia: "2026-09-02" as DiaISO,
      estado: "ganha",
    });
  });

  test("dois certificados contam 2 de 3 para Três cursos concluídos", () => {
    expect(marco(aluna, "tres_cursos")).toEqual({
      estado: "por_ganhar",
      feitas: 2,
      pct: 66,
      total: 3,
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
      pct: 0,
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
      pct: 0,
      pontosPorAula: 10,
    });
  });

  test("o primeiro curso aponta o curso mais adiantado", () => {
    expect(marco(novo, "primeiro_curso")).toEqual({
      estado: "por_ganhar",
      maisPerto: { curso: "Curso fabrica", feitas: 0, total: 7 },
      pct: 0,
    });
    expect(novo.certificados).toHaveLength(1);
  });

  test("sem liberação e sem vitrine, nada a apontar", () => {
    const vazio = montarConquistas(NADA, SEXTA);
    expect(vazio.medalhas.map((m) => m.medalha)).toEqual([
      { estado: "por_ganhar", pct: 0, proxima: null },
      { estado: "por_ganhar", maisBarato: null, pct: 0, pontosPorAula: 10 },
      { estado: "por_ganhar", maisPerto: null, pct: 0 },
      { estado: "por_ganhar", feitas: 0, pct: 0, total: 3 },
      {
        amostraVista: null,
        estado: "por_ganhar",
        feitas: 0,
        pct: 0,
        total: 2,
      },
      { estado: "por_ganhar", maisAdiantado: null, pct: 0 },
      { estado: "por_ganhar", pct: 0 },
      { estado: "por_ganhar", melhor: null, pct: 0 },
      { estado: "por_ganhar", feitas: 0, pct: 0, total: 3 },
      { estado: "por_ganhar", feitas: 0, pct: 0, total: 1000 },
    ]);
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
        lancamentos: [{ criadoEm: new Date(), cursoId: null, motivo: "troca" }],
      },
      SEXTA
    )
  ).toThrow("Lançamento de troca sem o curso da liberação.");
});

const troca = (cursoId: string, iso: string) => ({
  criadoEm: new Date(iso),
  cursoId,
  motivo: "troca" as const,
});

const trocado = (curso: typeof AUTO, iso: string) => ({
  amostra: null,
  curso,
  liberadaEm: new Date(iso),
});

const tentativas = (
  aulaId: string,
  o: Partial<TentativasDaAula> & { primeira: [number, number, string] }
): TentativasDaAula => {
  const [acertos, total, iso] = o.primeira;
  return {
    aprovada: o.aprovada ?? false,
    aprovadaEm: o.aprovadaEm ?? null,
    aulaId,
    primeiraAcertos: acertos,
    primeiraEm: new Date(iso),
    primeiraTotal: total,
    tentativas: o.tentativas ?? 1,
    ultimaEm: new Date(iso),
    ultimosAcertos: acertos,
    ultimoTotal: total,
  };
};

describe("as medalhas novas ganhas", () => {
  const VISTA = cursoLinha("vista", { aulas: [5] });
  const DEPOIS = cursoLinha("depois", { aulas: [2] });
  const TERCEIRO = cursoLinha("terceiro", { aulas: [3] });
  const c = montarConquistas(
    {
      ...NADA,
      assistidas: [
        // A amostra de VISTA antes da troca dela; a aula 1 de DEPOIS só depois.
        assistida(VISTA, 1, "2026-10-01T14:00:00Z"),
        assistida(DEPOIS, 1, "2026-09-21T14:00:00Z"),
        assistida(DEPOIS, 2, "2026-09-22T14:00:00Z"),
      ],
      certificados: [
        {
          codigo: "PS-AUTO",
          curso: capa(AUTO),
          cursoId: AUTO.id,
          emitidoEm: new Date("2026-09-01T12:00:00Z"),
          segundosDeVideo: 0,
        },
        {
          codigo: "PS-DEPOIS",
          curso: capa(DEPOIS),
          cursoId: DEPOIS.id,
          emitidoEm: new Date("2026-10-12T12:00:00Z"),
          segundosDeVideo: 0,
        },
        {
          codigo: "PS-REV",
          curso: capa(REVOGADO),
          cursoId: REVOGADO.id,
          emitidoEm: new Date("2026-10-14T12:00:00Z"),
          segundosDeVideo: 0,
        },
      ],
      estudoPorDia: [
        { dia: "2026-10-03", pontos: 600 },
        { dia: "2026-10-01", pontos: 300 },
        { dia: "2026-10-02", pontos: 100 },
      ],
      lancamentos: [
        troca(TERCEIRO.id, "2026-10-10T15:00:00Z"),
        troca(DEPOIS.id, "2026-09-20T15:00:00Z"),
        troca(VISTA.id, "2026-10-05T15:00:00Z"),
      ],
      liberacoes: [
        trocado(DEPOIS, "2026-09-20T15:00:00Z"),
        trocado(VISTA, "2026-10-05T15:00:00Z"),
        trocado(TERCEIRO, "2026-10-10T15:00:00Z"),
      ],
      questionarios: [
        tentativas("q1", {
          aprovada: true,
          aprovadaEm: new Date("2026-10-08T14:00:00Z"),
          primeira: [2, 4, "2026-10-07T14:00:00Z"],
          tentativas: 2,
        }),
        tentativas("q2", {
          aprovada: true,
          aprovadaEm: new Date("2026-10-09T14:00:00Z"),
          primeira: [3, 3, "2026-10-09T14:00:00Z"],
        }),
      ],
    },
    SEXTA
  );

  test("Três cursos trocados fecha no dia da terceira troca", () => {
    expect(marco(c, "tres_trocas")).toEqual({
      dia: "2026-10-10" as DiaISO,
      estado: "ganha",
    });
  });

  test("Da amostra à troca é a troca do curso cuja amostra veio antes, não a primeira troca", () => {
    expect(marco(c, "amostra_e_troca")).toEqual({
      dia: "2026-10-05" as DiaISO,
      estado: "ganha",
    });
  });

  test("Troca até o fim é o certificado de um curso trocado", () => {
    expect(marco(c, "troca_ate_o_fim")).toEqual({
      dia: "2026-10-12" as DiaISO,
      estado: "ganha",
    });
  });

  test("Primeiro questionário é a primeira aprovação, de qualquer tentativa", () => {
    expect(marco(c, "primeiro_questionario")).toEqual({
      dia: "2026-10-08" as DiaISO,
      estado: "ganha",
    });
  });

  test("Nota cheia é a tentativa número 1 com todas certas", () => {
    expect(marco(c, "nota_cheia")).toEqual({
      dia: "2026-10-09" as DiaISO,
      estado: "ganha",
    });
  });

  test("Três cursos concluídos fecha no terceiro certificado, também de curso revogado", () => {
    expect(marco(c, "tres_cursos")).toEqual({
      dia: "2026-10-14" as DiaISO,
      estado: "ganha",
    });
  });

  test("Mil pontos estudando fecha no dia em que a soma chega a 1.000", () => {
    expect(marco(c, "mil_pontos")).toEqual({
      dia: "2026-10-03" as DiaISO,
      estado: "ganha",
    });
  });
});

describe("as medalhas novas por ganhar", () => {
  const TROCADO = cursoLinha("trocado", { aulas: [10] });
  const INTEIRO = cursoLinha("inteiro", { aulas: [3], perguntas: 1 });
  const AMOSTRA = cursoLinha("amostra", { aulas: [4] });
  const c = montarConquistas(
    {
      ...NADA,
      assistidas: [
        ...[1, 2, 3, 4].map((p) =>
          assistida(TROCADO, p, `2026-10-0${p}T14:00:00Z`)
        ),
        ...[1, 2, 3].map((p) =>
          assistida(INTEIRO, p, `2026-10-0${p}T15:00:00Z`)
        ),
        assistida(AMOSTRA, 1, "2026-10-06T14:00:00Z"),
      ],
      estudoPorDia: [
        { dia: "2026-10-01", pontos: 500 },
        { dia: "2026-10-02", pontos: 496 },
      ],
      lancamentos: [troca(TROCADO.id, "2026-09-30T15:00:00Z")],
      liberacoes: [
        trocado(TROCADO, "2026-09-30T15:00:00Z"),
        liberado(INTEIRO, 1),
        { amostra: { preco: 300 }, curso: AMOSTRA, liberadaEm: new Date() },
      ],
      questionarios: [
        // Errou de primeira e passou na segunda: aprovou, sem nota cheia.
        tentativas(idAula(INTEIRO.id, 0, 1), {
          aprovada: true,
          aprovadaEm: new Date("2026-10-04T14:00:00Z"),
          primeira: [0, 1, "2026-10-04T14:00:00Z"],
          tentativas: 2,
        }),
        tentativas("outra", { primeira: [4, 5, "2026-10-05T14:00:00Z"] }),
        tentativas("pior", { primeira: [2, 5, "2026-10-05T14:00:00Z"] }),
      ],
    },
    SEXTA
  );

  test("Três cursos trocados conta as trocas de 3", () => {
    expect(marco(c, "tres_trocas")).toEqual({
      estado: "por_ganhar",
      feitas: 1,
      pct: 33,
      total: 3,
    });
  });

  test("Da amostra à troca: a amostra vista é o primeiro dos dois passos", () => {
    expect(marco(c, "amostra_e_troca")).toEqual({
      amostraVista: "Curso amostra",
      estado: "por_ganhar",
      feitas: 1,
      pct: 50,
      total: 2,
    });
  });

  test("Troca até o fim conta as aulas do curso trocado mais adiantado", () => {
    expect(marco(c, "troca_ate_o_fim")).toEqual({
      estado: "por_ganhar",
      maisAdiantado: { curso: "Curso trocado", feitas: 4, total: 10 },
      pct: 40,
    });
  });

  test("Primeiro curso concluído conta aulas e questionários do curso mais adiantado", () => {
    // inteiro: 3 de 3 aulas e 1 de 3 questionários, 4 de 6; trocado: 4 de 10.
    expect(marco(c, "primeiro_curso")).toEqual({
      estado: "por_ganhar",
      maisPerto: { curso: "Curso inteiro", feitas: 3, total: 3 },
      pct: 66,
    });
  });

  test("Nota cheia: o melhor acerto de primeira, mesmo com a aprovação depois", () => {
    expect(marco(c, "nota_cheia")).toEqual({
      estado: "por_ganhar",
      melhor: { feitas: 4, total: 5 },
      pct: 80,
    });
  });

  test("Mil pontos estudando: 996 de 1.000 fica em 99%, não em 100%", () => {
    expect(marco(c, "mil_pontos")).toEqual({
      estado: "por_ganhar",
      feitas: 996,
      pct: 99,
      total: 1000,
    });
  });
});

test("a porcentagem por ganhar arredonda para baixo e não chega a 100", () => {
  expect(porcentagemPorGanhar(199, 200)).toBe(99);
  expect(porcentagemPorGanhar(10, 10)).toBe(99);
  expect(porcentagemPorGanhar(1, 3)).toBe(33);
  expect(porcentagemPorGanhar(2, 3)).toBe(66);
  expect(porcentagemPorGanhar(0, 0)).toBe(0);
});

test("Troca até o fim com as aulas todas e o questionário por aprovar fica em 99%", () => {
  const CHEIO = cursoLinha("cheio", { aulas: [2], perguntas: 1 });
  const c = montarConquistas(
    {
      ...NADA,
      assistidas: [
        assistida(CHEIO, 1, "2026-10-01T14:00:00Z"),
        assistida(CHEIO, 2, "2026-10-02T14:00:00Z"),
      ],
      lancamentos: [troca(CHEIO.id, "2026-09-30T15:00:00Z")],
      liberacoes: [trocado(CHEIO, "2026-09-30T15:00:00Z")],
    },
    SEXTA
  );
  expect(marco(c, "troca_ate_o_fim")).toEqual({
    estado: "por_ganhar",
    maisAdiantado: { curso: "Curso cheio", feitas: 2, total: 2 },
    pct: 99,
  });
});
