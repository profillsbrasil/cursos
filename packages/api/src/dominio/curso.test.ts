import { describe, expect, test } from "bun:test";

import { estadoDoCurso, estadosDaTrilha, niveis, progresso } from "./curso";
import {
  cursoCat,
  cursoLinha,
  historico,
  idAula,
  SEM_LIBERACAO,
  trilhaCat,
} from "./exemplo";
import { historicoDe } from "./historico";
import { montarPainel } from "./painel";
import type { AulaId, CursoId } from "./tipos";

const livre = { tipo: "livre" } as const;
const todas = (chave: string, aulas: number[]) =>
  aulas.flatMap((qtd, m) =>
    Array.from({ length: qtd }, (_, p) => idAula(chave, m, p + 1))
  );

describe("estadoDoCurso", () => {
  test("certificado mantém concluido mesmo com aula nova no curso", () => {
    const c = cursoCat("c", { aulas: [3] });
    const h = historico({ assistidas: todas("c", [2]), certificados: ["c"] });
    expect(estadoDoCurso(c, h, livre).tipo).toBe("concluido");
  });

  test("curso concluído que volta para em produção continua concluido", () => {
    const c = cursoCat("c", { aulas: [2], status: "em_producao" });
    const h = historico({ certificados: ["c"] });
    expect(estadoDoCurso(c, h, livre).tipo).toBe("concluido");
  });

  test("curso em produção é em_breve mesmo com liberação", () => {
    const c = cursoCat("c", { aulas: [2], status: "em_producao" });
    expect(estadoDoCurso(c, historico({}), livre)).toEqual({
      tipo: "em_breve",
    });
  });

  test("em_breve vence bloqueado", () => {
    const c = cursoCat("c", { aulas: [2], status: "em_producao" });
    const antes = {
      concluido: false,
      curso: { id: "a" as CursoId, titulo: "A" },
      tipo: "na_trilha",
    } as const;
    expect(estadoDoCurso(c, historico({}), antes).tipo).toBe("em_breve");
  });

  test("curso publicado sem aulas é em_breve e nunca vira prova", () => {
    const c = cursoCat("c", { aulas: [] });
    expect(estadoDoCurso(c, historico({}), livre).tipo).toBe("em_breve");
    const vazioDeAulas = cursoCat("v", { aulas: [0] });
    expect(estadoDoCurso(vazioDeAulas, historico({}), livre).tipo).toBe(
      "em_breve"
    );
  });

  test("todas as aulas assistidas sem certificado é prova", () => {
    const c = cursoCat("c", { aulas: [2, 1] });
    const h = historico({ assistidas: todas("c", [2, 1]) });
    expect(estadoDoCurso(c, h, livre)).toEqual({ tipo: "prova" });
  });

  test("posição salva sem aula assistida já conta como em_andamento", () => {
    const c = cursoCat("c", { aulas: [3] });
    const h = historico({ posicoes: [[idAula("c", 0, 1), 30]] });
    expect(estadoDoCurso(c, h, livre)).toEqual({
      proximaAula: idAula("c", 0, 1) as AulaId,
      tipo: "em_andamento",
    });
  });

  test("sem aula assistida e sem posição é nao_iniciado", () => {
    const c = cursoCat("c", { aulas: [3] });
    expect(estadoDoCurso(c, historico({}), livre)).toEqual({
      primeiraAula: idAula("c", 0, 1) as AulaId,
      tipo: "nao_iniciado",
    });
  });
});

describe("estadosDaTrilha", () => {
  const a = cursoCat("a", { aulas: [2] });
  const b = cursoCat("b", { aulas: [2] });
  const t = trilhaCat("t", [a, b]);

  test("segundo curso da trilha fica bloqueado até o primeiro ter certificado", () => {
    const tudoAssistido = historico({ assistidas: todas("a", [2]) });
    expect(
      estadosDaTrilha(t, tudoAssistido, new Set()).map((e) => e.tipo)
    ).toEqual(["prova", "bloqueado"]);
    const comCertificado = historico({
      assistidas: todas("a", [2]),
      certificados: ["a"],
    });
    expect(
      estadosDaTrilha(t, comCertificado, new Set()).map((e) => e.tipo)
    ).toEqual(["concluido", "nao_iniciado"]);
  });

  test("bloqueado aponta o curso anterior em liberadoPor", () => {
    const [, segundo] = estadosDaTrilha(t, historico({}), new Set());
    expect(segundo).toEqual({
      liberadoPor: { id: "a" as CursoId, titulo: "Curso a" },
      tipo: "bloqueado",
    });
  });

  test("curso depois de um em_breve fica bloqueado", () => {
    const breve = cursoCat("breve", { aulas: [2], status: "em_producao" });
    const trilha = trilhaCat("t2", [breve, b]);
    expect(
      estadosDaTrilha(trilha, historico({}), new Set()).map((e) => e.tipo)
    ).toEqual(["em_breve", "bloqueado"]);
  });

  test("liberação direta ignora a ordem da trilha", () => {
    const estados = estadosDaTrilha(
      t,
      historico({}),
      new Set(["b" as CursoId])
    );
    expect(estados.map((e) => e.tipo)).toEqual([
      "nao_iniciado",
      "nao_iniciado",
    ]);
  });
});

describe("progresso", () => {
  test("199 de 200 aulas mostra 99%", () => {
    const c = cursoCat("c", { aulas: [200] });
    const assistidas = new Set(todas("c", [199]) as AulaId[]);
    expect(progresso(c, assistidas)).toEqual({
      feitas: 199,
      pct: 99,
      total: 200,
    });
  });

  test("aula assistida de outro curso não entra no progresso", () => {
    const c = cursoCat("c", { aulas: [4] });
    const assistidas = new Set([
      idAula("c", 0, 1),
      idAula("outro", 0, 1),
      idAula("outro", 0, 2),
    ] as AulaId[]);
    expect(progresso(c, assistidas)).toEqual({ feitas: 1, pct: 25, total: 4 });
  });
});

describe("niveis", () => {
  const comNiveis = cursoCat("n", {
    aulas: [2, 2, 1],
    niveis: [
      { nome: "Primeiro", ordem: 1 },
      { nome: "Segundo", ordem: 2 },
      { nome: "Vazio", ordem: 3 },
    ],
    nivelPorModulo: [1, 1, 2],
  });

  test("nível obtido exige todas as aulas dos módulos daquele nível", () => {
    const quase = new Set([
      idAula("n", 0, 1),
      idAula("n", 0, 2),
      idAula("n", 1, 1),
    ] as AulaId[]);
    expect(niveis(comNiveis, quase).faixas[0]).toMatchObject({
      feitas: 3,
      obtido: false,
      total: 4,
    });
    const completo = new Set([...quase, idAula("n", 1, 2)] as AulaId[]);
    expect(niveis(comNiveis, completo).faixas[0]?.obtido).toBe(true);
  });

  test("nível sem aulas nunca está obtido", () => {
    const tudo = new Set(todas("n", [2, 2, 1]) as AulaId[]);
    expect(niveis(comNiveis, tudo).faixas[2]).toMatchObject({
      nome: "Vazio",
      obtido: false,
      total: 0,
    });
  });

  test("próximo nível é o primeiro não obtido e é null com todos obtidos", () => {
    expect(niveis(comNiveis, new Set()).proximo?.nome).toBe("Primeiro");
    const semVazio = cursoCat("s", {
      aulas: [1, 1],
      niveis: [
        { nome: "Um", ordem: 1 },
        { nome: "Dois", ordem: 2 },
      ],
      nivelPorModulo: [1, 2],
    });
    const tudo = new Set(todas("s", [1, 1]) as AulaId[]);
    expect(niveis(semVazio, tudo).proximo).toBeNull();
  });

  test("próximo nível pula nível sem aulas", () => {
    const meio = cursoCat("v", {
      aulas: [1, 1],
      niveis: [
        { nome: "A", ordem: 1 },
        { nome: "B", ordem: 2 },
        { nome: "C", ordem: 3 },
      ],
      nivelPorModulo: [1, 3],
    });
    const soA = new Set([idAula("v", 0, 1)] as AulaId[]);
    expect(niveis(meio, soA).proximo?.nome).toBe("C");
    const tudo = new Set(todas("v", [1, 1]) as AulaId[]);
    expect(niveis(meio, tudo).proximo).toBeNull();
  });
});

describe("começou abre", () => {
  const a = cursoCat("a", { aulas: [2] });
  const b = cursoCat("b", { aulas: [3] });
  const c = cursoCat("c", { aulas: [2] });
  const novo = cursoCat("novo", { aulas: [2] });
  // a concluído, b começado só por posição salva, c e novo intocados
  const h = historico({
    assistidas: todas("a", [2]),
    certificados: ["a"],
    posicoes: [[idAula("b", 0, 1), 40]],
  });
  const tipos = (cursos: (typeof a)[], hist = h) =>
    estadosDaTrilha(trilhaCat("t", cursos), hist, new Set()).map((e) => e.tipo);

  test("curso começado não volta a bloqueado quando um curso entra antes dele", () => {
    expect(tipos([a, b, c])).toEqual([
      "concluido",
      "em_andamento",
      "bloqueado",
    ]);
    expect(tipos([a, novo, b, c])).toEqual([
      "concluido",
      "nao_iniciado",
      "em_andamento",
      "bloqueado",
    ]);
  });

  test("curso novo no topo não tranca o começado", () => {
    expect(tipos([novo, b, a])).toEqual([
      "nao_iniciado",
      "em_andamento",
      "concluido",
    ]);
  });

  test("reordenar não tranca o curso começado", () => {
    expect(tipos([c, b, a])).toEqual([
      "nao_iniciado",
      "em_andamento",
      "concluido",
    ]);
  });

  test("curso com aula assistida atrás de um curso novo continua em_andamento", () => {
    const comAula = historico({ assistidas: [idAula("b", 0, 1)] });
    expect(
      estadoDoCurso(b, comAula, {
        concluido: false,
        curso: { id: "novo" as CursoId, titulo: "Curso novo" },
        tipo: "na_trilha",
      })
    ).toEqual({
      proximaAula: idAula("b", 0, 2) as AulaId,
      tipo: "em_andamento",
    });
  });

  test("curso com todas as aulas assistidas atrás de um curso novo vai para a prova", () => {
    const comTudo = historico({ assistidas: todas("b", [3]) });
    expect(tipos([novo, b], comTudo)).toEqual(["nao_iniciado", "prova"]);
  });

  test("curso não tocado atrás de um curso novo continua bloqueado", () => {
    expect(tipos([novo, c])).toEqual(["nao_iniciado", "bloqueado"]);
  });

  test("curso começado que voltou para em produção é em_breve", () => {
    const arquivado = cursoCat("b", { aulas: [3], status: "em_producao" });
    expect(tipos([a, arquivado])).toEqual(["concluido", "em_breve"]);
  });

  test("no painel, a retomada continua no curso começado depois da inserção", () => {
    const linhaB = cursoLinha("b", { aulas: [3] });
    const painel = montarPainel({
      ...SEM_LIBERACAO,
      assistidas: [
        {
          assistidaEm: new Date("2026-10-06T15:00:00Z"),
          aulaId: idAula("b", 0, 1),
        },
      ],
      liberacoes: [
        {
          curso: null,
          liberadaEm: new Date("2026-08-01T12:00:00Z"),
          trilha: {
            cursos: [
              { curso: cursoLinha("novo", { aulas: [2] }), posicao: 1 },
              { curso: linhaB, posicao: 2 },
            ],
            descricao: "Descrição",
            id: "t",
            slug: "t",
            titulo: "Trilha t",
          },
        },
      ],
    });
    expect(
      painel.trilhas[0]?.cursos.map((x) => [x.slug, x.estado.tipo])
    ).toEqual([
      ["novo", "nao_iniciado"],
      ["b", "em_andamento"],
    ]);
    expect(painel.retomada).toMatchObject({
      curso: { slug: "b" },
      tipo: "continuar",
    });
  });
});

describe("historicoDe", () => {
  test("posição em 0 s não entra no histórico e não conta como começado", () => {
    const h = historicoDe({
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
    });
    expect([...h.posicoes.keys()]).toEqual([idAula("c", 0, 1) as AulaId]);
    const novo = cursoCat("novo", { aulas: [1] });
    const b = cursoCat("b", { aulas: [2] });
    expect(
      estadosDaTrilha(trilhaCat("t", [novo, b]), h, new Set()).map(
        (e) => e.tipo
      )
    ).toEqual(["nao_iniciado", "bloqueado"]);
  });
});
