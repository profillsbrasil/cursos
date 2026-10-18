import { describe, expect, test } from "bun:test";

import { type CursoComAulas, lerCursoDoAluno } from "./curso-do-aluno";
import { cursoCat, historico, idAula, questionario } from "./exemplo";
import { estudoDe } from "./historico";
import type { AulaId, Historico } from "./tipos";

const ler = (
  c: CursoComAulas,
  h: Historico,
  atividade: ReadonlyMap<AulaId, string> = new Map()
) => lerCursoDoAluno(c, { atividade, historico: h });

const todas = (chave: string, aulas: number[]) =>
  aulas.flatMap((qtd, m) =>
    Array.from({ length: qtd }, (_, p) => idAula(chave, m, p + 1))
  );

const aula = (chave: string, modulo: number, posicao: number) =>
  idAula(chave, modulo, posicao) as AulaId;

describe("os cinco estados do curso, de uma leitura só", () => {
  // Dois módulos: 0 com duas aulas sem pergunta, 1 com uma aula de questionário.
  const c: CursoComAulas = {
    ...cursoCat("c", { aulas: [2, 1] }),
    modulos: cursoCat("c", { aulas: [2, 1] }).modulos.map((m, i) => ({
      ...m,
      aulas: m.aulas.map((a) => ({ ...a, perguntas: i === 1 ? 2 : 0 })),
    })),
  };
  const [a1, a2, a3] = [aula("c", 0, 1), aula("c", 0, 2), aula("c", 1, 1)];

  test("em_breve: em produção, sem aula da vez e incompleto mesmo com tudo feito", () => {
    const h = historico({
      assistidas: [a1, a2, a3],
      questionarios: [[a3, questionario(true)]],
    });
    expect(ler({ ...c, status: "em_producao" }, h)).toEqual({
      aulaDaVez: null,
      completo: false,
      estado: { tipo: "em_breve" },
      progresso: { feitas: 3, pct: 100, total: 3 },
      questionarios: { feitas: 1, pct: 100, total: 1 },
    });
  });

  test("nao_iniciado: a aula da vez é a primeira, no segundo 0", () => {
    expect(ler(c, historico({}))).toEqual({
      aulaDaVez: {
        id: a1,
        onde: { aula: 1, modulo: { numero: 0, titulo: "Módulo 0 de c" } },
        posicaoSeg: 0,
      },
      completo: false,
      estado: { primeiraAula: a1, tipo: "nao_iniciado" },
      progresso: { feitas: 0, pct: 0, total: 3 },
      questionarios: { feitas: 0, pct: 0, total: 1 },
    });
  });

  test("em_andamento: a aula da vez é a da última atividade, na posição salva", () => {
    const h = historico({
      assistidas: [a1],
      posicoes: [[a2, 95]],
    });
    const atividade = new Map([
      [a1, "2026-10-01T12:00:00.000Z"],
      [a2, "2026-10-02T12:00:00.000Z"],
    ]);
    expect(ler(c, h, atividade)).toEqual({
      aulaDaVez: {
        id: a2,
        onde: { aula: 2, modulo: { numero: 0, titulo: "Módulo 0 de c" } },
        posicaoSeg: 95,
      },
      completo: false,
      estado: { proximaAula: a2, tipo: "em_andamento" },
      progresso: { feitas: 1, pct: 33, total: 3 },
      questionarios: { feitas: 0, pct: 0, total: 1 },
    });
  });

  test("questionarios: a aula da vez é a do questionário reprovado", () => {
    const h = historico({
      assistidas: [a1, a2, a3],
      questionarios: [[a3, questionario(false)]],
    });
    expect(ler(c, h)).toEqual({
      aulaDaVez: {
        id: a3,
        onde: { aula: 1, modulo: { numero: 1, titulo: "Módulo 1 de c" } },
        posicaoSeg: 0,
      },
      completo: false,
      estado: {
        aprovados: 0,
        proximaAula: a3,
        tipo: "questionarios",
        total: 1,
      },
      progresso: { feitas: 3, pct: 100, total: 3 },
      questionarios: { feitas: 0, pct: 0, total: 1 },
    });
  });

  test("tudo feito e sem certificado: completo, à espera da emissão", () => {
    const h = historico({
      assistidas: [a1, a2, a3],
      questionarios: [[a3, questionario(true)]],
    });
    const leitura = ler(c, h);
    expect(leitura.completo).toBe(true);
    expect(leitura.estado.tipo).toBe("questionarios");
  });

  test("concluido: com certificado, sem aula da vez", () => {
    const h = historico({
      assistidas: [a1, a2, a3],
      certificados: ["c"],
      questionarios: [[a3, questionario(true)]],
    });
    expect(ler(c, h)).toEqual({
      aulaDaVez: null,
      completo: true,
      estado: {
        certificado: {
          codigo: "CERT-c",
          emitidoEm: "2026-09-01T12:00:00.000Z",
        },
        tipo: "concluido",
      },
      progresso: { feitas: 3, pct: 100, total: 3 },
      questionarios: { feitas: 1, pct: 100, total: 1 },
    });
  });
});

describe("o estado do curso", () => {
  test("certificado mantém concluido mesmo com aula nova no curso", () => {
    const c = cursoCat("c", { aulas: [3] });
    const h = historico({ assistidas: todas("c", [2]), certificados: ["c"] });
    const leitura = ler(c, h);
    expect(leitura.estado.tipo).toBe("concluido");
    expect(leitura.completo).toBe(false);
  });

  test("curso concluído que volta para em produção continua concluido", () => {
    const c = cursoCat("c", { aulas: [2], status: "em_producao" });
    const h = historico({ certificados: ["c"] });
    expect(ler(c, h).estado.tipo).toBe("concluido");
  });

  test("curso começado que voltou para em produção é em_breve", () => {
    const c = cursoCat("c", { aulas: [3], status: "em_producao" });
    const h = historico({ assistidas: [idAula("c", 0, 1)] });
    expect(ler(c, h).estado).toEqual({ tipo: "em_breve" });
  });

  test("curso publicado sem aulas é em_breve e nunca vira prova", () => {
    const c = cursoCat("c", { aulas: [] });
    expect(ler(c, historico({})).estado.tipo).toBe("em_breve");
    const vazioDeAulas = cursoCat("v", { aulas: [0] });
    expect(ler(vazioDeAulas, historico({})).estado.tipo).toBe("em_breve");
  });

  test("questionário reprovado vem antes do por fazer", () => {
    const c = cursoCat("c", { aulas: [2, 1], perguntas: 3 });
    const [a1, a2, a3] = [aula("c", 0, 1), aula("c", 0, 2), aula("c", 1, 1)];
    const h = historico({
      assistidas: [a1, a2, a3],
      questionarios: [
        [a1, questionario(true)],
        [a3, questionario(false, { acertos: 1, total: 3 })],
      ],
    });
    expect(ler(c, h).estado).toEqual({
      aprovados: 1,
      proximaAula: a3,
      tipo: "questionarios",
      total: 3,
    });
    const semA3 = historico({
      assistidas: [a1, a2, a3],
      questionarios: [[a1, questionario(true)]],
    });
    expect(ler(c, semA3).aulaDaVez?.id).toBe(a2);
  });

  test("só as aulas com pergunta contam questionário: sem nenhuma, tudo assistido fica em questionarios com 0 de 0", () => {
    const c = cursoCat("c", { aulas: [2] });
    const h = historico({ assistidas: todas("c", [2]) });
    expect(ler(c, h).estado).toEqual({
      aprovados: 0,
      proximaAula: aula("c", 0, 1),
      tipo: "questionarios",
      total: 0,
    });
  });

  test("tentativa sem aula assistida já conta como em_andamento", () => {
    const c = cursoCat("c", { aulas: [2], perguntas: 1 });
    const h = historico({
      questionarios: [[idAula("c", 0, 2), questionario(false)]],
    });
    expect(ler(c, h).estado).toEqual({
      proximaAula: aula("c", 0, 1),
      tipo: "em_andamento",
    });
  });

  test("posição salva sem aula assistida já conta como em_andamento", () => {
    const c = cursoCat("c", { aulas: [3] });
    const h = historico({ posicoes: [[idAula("c", 0, 1), 30]] });
    expect(ler(c, h).estado).toEqual({
      proximaAula: aula("c", 0, 1),
      tipo: "em_andamento",
    });
  });

  test("última atividade numa aula já assistida leva à próxima não assistida", () => {
    const c = cursoCat("c", { aulas: [3] });
    const h = historico({
      assistidas: [idAula("c", 0, 1), idAula("c", 0, 2)],
      posicoes: [[idAula("c", 0, 3), 40]],
    });
    const atividade = new Map([
      [aula("c", 0, 3), "2026-10-01T12:00:00.000Z"],
      [aula("c", 0, 1), "2026-10-05T12:00:00.000Z"],
    ]);
    expect(ler(c, h, atividade).aulaDaVez).toMatchObject({
      id: aula("c", 0, 3),
      posicaoSeg: 40,
    });
  });
});

describe("o progresso", () => {
  test("199 de 200 aulas mostra 99%", () => {
    const c = cursoCat("c", { aulas: [200] });
    const h = historico({ assistidas: todas("c", [199]) });
    expect(ler(c, h).progresso).toEqual({ feitas: 199, pct: 99, total: 200 });
  });

  test("aula assistida de outro curso não entra no progresso", () => {
    const c = cursoCat("c", { aulas: [4] });
    const h = historico({
      assistidas: [idAula("c", 0, 1), idAula("outro", 0, 1)],
    });
    expect(ler(c, h).progresso).toEqual({ feitas: 1, pct: 25, total: 4 });
  });
});

describe("estudoDe", () => {
  test("posição em 0 s não entra no estudo e não conta como começado", () => {
    const estudo = estudoDe({
      assistidas: [],
      certificados: [],
      posicoes: [
        {
          atualizadaEm: new Date("2026-10-07T12:00:00Z"),
          aulaId: idAula("b", 0, 1),
          posicaoSeg: 0,
        },
        {
          atualizadaEm: new Date("2026-10-07T12:00:00Z"),
          aulaId: idAula("c", 0, 1),
          posicaoSeg: 12,
        },
      ],
      questionarios: [],
    });
    expect([...estudo.historico.posicoes.keys()]).toEqual([aula("c", 0, 1)]);
    expect([...estudo.atividade.keys()]).toEqual([aula("c", 0, 1)]);
    const b = cursoCat("b", { aulas: [2] });
    expect(lerCursoDoAluno(b, estudo).estado.tipo).toBe("nao_iniciado");
  });
});

describe("completo", () => {
  const c = cursoCat("c", { aulas: [2], perguntas: 2 });
  const [a1, a2] = [idAula("c", 0, 1), idAula("c", 0, 2)];
  const aprovados: [string, ReturnType<typeof questionario>][] = [
    [a1, questionario(true)],
    [a2, questionario(true)],
  ];

  test("todas assistidas e todo questionário aprovado", () => {
    const h = historico({ assistidas: [a1, a2], questionarios: aprovados });
    expect(ler(c, h).completo).toBe(true);
  });

  test("falta uma aula, ou um questionário reprovado, ou o curso não tem aula", () => {
    expect(
      ler(c, historico({ assistidas: [a1], questionarios: aprovados })).completo
    ).toBe(false);
    const reprovado = historico({
      assistidas: [a1, a2],
      questionarios: [
        [a1, questionario(true)],
        [a2, questionario(false)],
      ],
    });
    expect(ler(c, reprovado).completo).toBe(false);
    expect(ler(cursoCat("v", { aulas: [] }), historico({})).completo).toBe(
      false
    );
  });

  test("aula sem pergunta não pede questionário", () => {
    const semQuiz = cursoCat("s", { aulas: [1] });
    expect(
      ler(semQuiz, historico({ assistidas: [idAula("s", 0, 1)] })).completo
    ).toBe(true);
  });
});
