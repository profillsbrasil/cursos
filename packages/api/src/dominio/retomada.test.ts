import { describe, expect, test } from "bun:test";

import { cursoCat, historico, idAula } from "./exemplo";
import { aulaDeRetomada, type CursoNaTela, retomada } from "./retomada";
import type {
  AulaId,
  CursoCatalogo,
  CursoId,
  EstadoCurso,
  Historico,
} from "./tipos";

const andamento = (_c: CursoCatalogo, proxima: string): EstadoCurso => ({
  proximaAula: proxima as AulaId,
  tipo: "em_andamento",
});

const naTela = (curso: CursoCatalogo, estado: EstadoCurso): CursoNaTela => ({
  curso,
  estado,
  trilha: null,
});

const entrada = (cursos: CursoNaTela[], h: Historico) => ({
  atividade: new Map(
    [...h.posicoes.entries()].map(
      ([aula, p]) => [aula, p.atualizadaEm] as const
    )
  ),
  cursos,
  historico: h,
});

const c = cursoCat("c", { aulas: [4], duracaoSeg: 580 });

describe("retomada", () => {
  test("continuar volta ao segundo exato da última aula aberta", () => {
    const h = historico({
      posicoes: [
        [idAula("c", 0, 1), 100, "2026-10-06T12:00:00.000Z"],
        [idAula("c", 0, 3), 222, "2026-10-07T12:00:00.000Z"],
      ],
    });
    const r = retomada(
      entrada([naTela(c, andamento(c, idAula("c", 0, 1)))], h)
    );
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
    const r = retomada(
      entrada([naTela(c, andamento(c, idAula("c", 0, 3)))], h)
    );
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
    const r = retomada(
      entrada([naTela(c, andamento(c, idAula("c", 0, 3)))], h)
    );
    expect(r).toMatchObject({
      aula: { faltaSeg: 280, id: idAula("c", 0, 3), posicaoSeg: 300 },
      tipo: "continuar",
    });
  });

  test("posição em curso bloqueado ou em breve é ignorada", () => {
    const bloq = cursoCat("bloq", { aulas: [2] });
    const breve = cursoCat("breve", { aulas: [2], status: "em_producao" });
    const h = historico({
      assistidas: [idAula("c", 0, 1)],
      posicoes: [
        [idAula("bloq", 0, 1), 50, "2026-10-07T12:00:00.000Z"],
        [idAula("breve", 0, 1), 50, "2026-10-07T13:00:00.000Z"],
      ],
    });
    const r = retomada(
      entrada(
        [
          naTela(c, andamento(c, idAula("c", 0, 2))),
          naTela(bloq, {
            liberadoPor: { id: "c" as CursoId, titulo: "Curso c" },
            tipo: "bloqueado",
          }),
          naTela(breve, { tipo: "em_breve" }),
        ],
        h
      )
    );
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
    const r = retomada(
      entrada([naTela(c, andamento(c, idAula("c", 0, 2)))], h)
    );
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
    const r = retomada(
      entrada(
        [
          naTela(outro, andamento(outro, idAula("outro", 0, 2))),
          naTela(c, andamento(c, idAula("c", 0, 2))),
        ],
        h
      )
    );
    expect(r).toMatchObject({
      aula: { id: idAula("outro", 0, 2), posicaoSeg: 0 },
      curso: { slug: "outro" },
      tipo: "continuar",
    });
  });

  test("curso com todas as aulas assistidas leva à prova", () => {
    const novo = cursoCat("novo", { aulas: [2] });
    const h = historico({
      assistidas: [1, 2, 3, 4].map((p) => idAula("c", 0, p)),
    });
    const r = retomada(
      entrada(
        [
          naTela(novo, {
            primeiraAula: idAula("novo", 0, 1) as AulaId,
            tipo: "nao_iniciado",
          }),
          naTela(c, { tipo: "prova" }),
        ],
        h
      )
    );
    expect(r).toMatchObject({
      curso: { slug: "c" },
      progresso: { feitas: 4, pct: 100, total: 4 },
      tipo: "prova",
    });
  });

  test("sem nada iniciado, oferece começar o primeiro curso não iniciado", () => {
    const breve = cursoCat("breve", { aulas: [2], status: "em_producao" });
    const a = cursoCat("a", { aulas: [2] });
    const b = cursoCat("b", { aulas: [2] });
    const r = retomada(
      entrada(
        [
          naTela(breve, { tipo: "em_breve" }),
          naTela(a, {
            primeiraAula: idAula("a", 0, 1) as AulaId,
            tipo: "nao_iniciado",
          }),
          naTela(b, {
            primeiraAula: idAula("b", 0, 1) as AulaId,
            tipo: "nao_iniciado",
          }),
        ],
        historico({})
      )
    );
    expect(r).toMatchObject({
      aula: { id: idAula("a", 0, 1), numeroNoModulo: 1 },
      curso: { slug: "a" },
      modulo: { numero: 0 },
      tipo: "comecar",
    });
  });

  test("tudo concluído não gera retomada", () => {
    const certificado = { codigo: "X", emitidoEm: "2026-09-01T00:00:00.000Z" };
    const r = retomada(
      entrada([naTela(c, { certificado, tipo: "concluido" })], historico({}))
    );
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
  const cursos = [
    naTela(a, andamento(a, idAula("a", 0, 1))),
    naTela(b, andamento(b, idAula("b", 0, 2))),
  ];

  test("curso B com aula assistida hoje vence curso A com posição de semanas atrás", () => {
    const r = retomada({ atividade, cursos, historico: h });
    expect(r?.tipo === "continuar" && r.curso.slug).toBe("b");
    expect(r?.tipo === "continuar" && String(r.aula.id)).toBe(
      idAula("b", 0, 2)
    );
  });

  test("banner e entrada do curso levam à mesma aula", () => {
    const r = retomada({ atividade, cursos, historico: h });
    const daEntrada = aulaDeRetomada(
      b,
      andamento(b, idAula("b", 0, 2)) as Extract<
        EstadoCurso,
        { tipo: "em_andamento" }
      >,
      h,
      atividade
    );
    expect(r?.tipo === "continuar" && r.aula.id).toBe(daEntrada.aulaId);
  });
});
