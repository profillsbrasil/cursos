import { describe, expect, test } from "bun:test";

import { lerCursoDoAluno } from "./curso-do-aluno";
import { cursoCat, historico, idAula, questionario } from "./exemplo";
import type { Estudo } from "./historico";
import { type EntradaRetomada, retomada } from "./retomada";
import type { AulaId, CursoCatalogo, Historico } from "./tipos";

/** Os cursos na ordem da tela, cada um lido do mesmo estudo. A atividade, sem outra, é a das posições. */
const entrada = (
  cursos: CursoCatalogo[],
  h: Historico,
  atividade: ReadonlyMap<AulaId, string> = new Map(
    [...h.posicoes.entries()].map(
      ([aula, p]) => [aula, p.atualizadaEm] as const
    )
  )
): EntradaRetomada => {
  const estudo: Estudo = { atividade, historico: h };
  return {
    cursos: cursos.map((curso) => ({
      curso,
      leitura: lerCursoDoAluno(curso, estudo),
    })),
    estudo,
  };
};

const c = cursoCat("c", { aulas: [4], duracaoSeg: 580 });

describe("retomada", () => {
  test("continuar volta ao segundo exato da última aula aberta", () => {
    const h = historico({
      posicoes: [
        [idAula("c", 0, 1), 100, "2026-10-06T12:00:00.000Z"],
        [idAula("c", 0, 3), 222, "2026-10-07T12:00:00.000Z"],
      ],
    });
    const r = retomada(entrada([c], h));
    expect(r?.tipo).toBe("continuar");
    if (r?.tipo !== "continuar") {
      return;
    }
    expect(r.aula).toMatchObject({
      faltaSeg: 358,
      id: idAula("c", 0, 3),
      numeroNoModulo: 3,
      posicaoSeg: 222,
    });
  });

  test("última aula aberta já assistida leva à próxima não assistida no segundo 0 quando ela não tem posição", () => {
    const h = historico({
      assistidas: [idAula("c", 0, 1), idAula("c", 0, 2)],
      posicoes: [[idAula("c", 0, 2), 500]],
    });
    const r = retomada(entrada([c], h));
    expect(r).toMatchObject({
      aula: { id: idAula("c", 0, 3), posicaoSeg: 0 },
      tipo: "continuar",
    });
  });

  test("última aula aberta já assistida leva à próxima não assistida na posição salva dela", () => {
    const h = historico({
      assistidas: [idAula("c", 0, 1), idAula("c", 0, 2)],
      posicoes: [
        [idAula("c", 0, 3), 300, "2026-10-06T12:00:00.000Z"],
        [idAula("c", 0, 1), 120, "2026-10-07T12:00:00.000Z"],
      ],
    });
    const r = retomada(entrada([c], h));
    expect(r).toMatchObject({
      aula: { faltaSeg: 280, id: idAula("c", 0, 3), posicaoSeg: 300 },
      tipo: "continuar",
    });
  });

  test("posição em curso em breve é ignorada", () => {
    const breve = cursoCat("breve", { aulas: [2], status: "em_producao" });
    const h = historico({
      assistidas: [idAula("c", 0, 1)],
      posicoes: [[idAula("breve", 0, 1), 50, "2026-10-07T13:00:00.000Z"]],
    });
    const r = retomada(entrada([c, breve], h));
    expect(r).toMatchObject({
      aula: { id: idAula("c", 0, 2), posicaoSeg: 0 },
      curso: { slug: "c" },
      tipo: "continuar",
    });
  });

  test("posição em curso sem liberação ativa é ignorada", () => {
    const h = historico({
      assistidas: [idAula("c", 0, 1)],
      posicoes: [[idAula("revogado", 0, 1), 90]],
    });
    const r = retomada(entrada([c], h));
    expect(r).toMatchObject({
      aula: { id: idAula("c", 0, 2), posicaoSeg: 0 },
      curso: { slug: "c" },
    });
  });

  test("sem posição, retoma o primeiro curso em andamento", () => {
    const outro = cursoCat("outro", { aulas: [3] });
    const h = historico({
      assistidas: [idAula("c", 0, 1), idAula("outro", 0, 1)],
    });
    const r = retomada(entrada([outro, c], h));
    expect(r).toMatchObject({
      aula: { id: idAula("outro", 0, 2), posicaoSeg: 0 },
      curso: { slug: "outro" },
      tipo: "continuar",
    });
  });

  test("curso com todas as aulas assistidas leva ao questionário pendente, com a nota da última tentativa", () => {
    const novo = cursoCat("novo", { aulas: [2] });
    const comQuiz = cursoCat("c", { aulas: [4], perguntas: 3 });
    const pendente = idAula("c", 0, 3) as AulaId;
    const h = historico({
      assistidas: [1, 2, 3, 4].map((p) => idAula("c", 0, p)),
      questionarios: [
        [idAula("c", 0, 1), questionario(true)],
        [pendente, questionario(false, { acertos: 2, total: 3 })],
      ],
    });
    const r = retomada(entrada([novo, comQuiz], h));
    expect(r).toEqual({
      aula: {
        duracaoSeg: 600,
        id: pendente,
        numeroNoModulo: 3,
        titulo: "Aula 3 de c",
      },
      curso: { capa: comQuiz.capa, slug: "c", titulo: "Curso c" },
      modulo: { numero: 0, titulo: "Módulo 0 de c" },
      questionarios: { feitas: 1, pct: 25, total: 4 },
      tipo: "questionario",
      ultima: { acertos: 2, total: 3 },
    });
  });

  test("sem nada iniciado, oferece começar o primeiro curso não iniciado", () => {
    const breve = cursoCat("breve", { aulas: [2], status: "em_producao" });
    const a = cursoCat("a", { aulas: [2] });
    const b = cursoCat("b", { aulas: [2] });
    const r = retomada(entrada([breve, a, b], historico({})));
    expect(r).toMatchObject({
      aula: { id: idAula("a", 0, 1), numeroNoModulo: 1 },
      curso: { slug: "a" },
      modulo: { numero: 0 },
      tipo: "comecar",
    });
  });

  test("tudo concluído não gera retomada", () => {
    const r = retomada(entrada([c], historico({ certificados: ["c"] })));
    expect(r).toBeNull();
  });
});

describe("retomada pela atividade mais recente (item 24)", () => {
  const a = cursoCat("a", { aulas: [3] });
  const b = cursoCat("b", { aulas: [3] });
  const h = historico({
    assistidas: [idAula("b", 0, 1)],
    posicoes: [[idAula("a", 0, 2), 120, "2026-09-10T12:00:00.000Z"]],
  });
  const atividade = new Map([
    [idAula("a", 0, 2) as AulaId, "2026-09-10T12:00:00.000Z"],
    [idAula("b", 0, 1) as AulaId, "2026-10-07T15:00:00.000Z"],
  ]);
  test("curso B com aula assistida hoje vence curso A com posição de semanas atrás", () => {
    const r = retomada(entrada([a, b], h, atividade));
    expect(r?.tipo === "continuar" && r.curso.slug).toBe("b");
    expect(r?.tipo === "continuar" && String(r.aula.id)).toBe(
      idAula("b", 0, 2)
    );
  });

  test("banner e entrada do curso levam à mesma aula", () => {
    const r = retomada(entrada([a, b], h, atividade));
    const daEntrada = lerCursoDoAluno(b, { atividade, historico: h });
    expect(r?.tipo).toBe("continuar");
    expect(r?.aula.id).toBe(idAula("b", 0, 2) as AulaId);
    expect(daEntrada.aulaDaVez?.id).toBe(idAula("b", 0, 2) as AulaId);
  });
});

describe("aula N do módulo no banner", () => {
  const base = cursoCat("d", { aulas: [2] });
  const posicoes = [2, 3];
  const comBuraco: CursoCatalogo = {
    ...base,
    modulos: base.modulos.map((m) => ({
      ...m,
      aulas: m.aulas.map((a, i) => ({ ...a, posicao: posicoes[i] ?? 0 })),
    })),
  };
  const segunda = idAula("d", 0, 2) as AulaId;

  test("continuar numera pelo índice no módulo, como a coluna e o player", () => {
    const h = historico({ posicoes: [[segunda, 60]] });
    const r = retomada(entrada([comBuraco], h));
    expect(r).toMatchObject({
      aula: { id: segunda, numeroNoModulo: 2 },
      tipo: "continuar",
    });
  });

  test("começar numera pelo índice no módulo, como a coluna e o player", () => {
    const r = retomada(entrada([comBuraco], historico({})));
    expect(r).toMatchObject({
      aula: { id: idAula("d", 0, 1), numeroNoModulo: 1 },
      tipo: "comecar",
    });
  });
});
