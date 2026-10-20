import { describe, expect, test } from "bun:test";

import {
  cursoLinha,
  exemploDoPrototipo,
  HOJE_DO_EXEMPLO,
  idAula,
  SEM_LIBERACAO,
} from "./exemplo";
import { type LinhasPainel, montarPainel } from "./painel";
import type { AulaId, DiaISO } from "./tipos";

const em = (iso: string) => new Date(iso);

const montar = (l: LinhasPainel, hoje: DiaISO = HOJE_DO_EXEMPLO) =>
  montarPainel(l, hoje);

const linhas = (o: Partial<LinhasPainel>): LinhasPainel => ({
  ...SEM_LIBERACAO,
  ...o,
});

describe("montarPainel com o caso do protótipo", () => {
  const prototipo = () => montar(exemploDoPrototipo());

  test("os cursos saem pelo estado e, no empate, pela ordem da liberação", () => {
    expect(prototipo().cursos.map((c) => [c.slug, c.estado.tipo])).toEqual([
      ["comercial", "em_andamento"],
      ["nova-rotina", "em_andamento"],
      ["fabrica-montagem", "nao_iniciado"],
      ["gravacao", "em_breve"],
      ["autoavaliacao", "concluido"],
    ]);
  });

  test("o Continuar leva ao Comercial, no módulo 8, e a capa mostra o mesmo módulo", () => {
    const painel = prototipo();
    expect(painel.cursos[0]?.moduloAtual).toEqual({
      numero: 8,
      titulo: "Pilar Urgência",
    });
    expect(painel.retomada).toEqual({
      aula: {
        duracaoSeg: 634,
        faltaSeg: 412,
        id: idAula("comercial", 8, 4) as AulaId,
        numeroNoModulo: 4,
        posicaoSeg: 222,
        titulo: "Cronograma reverso",
      },
      curso: {
        capa: {
          alt: "Peça do treinamento Profills School: Vender com técnica, convencer com valor, fechar com método, com vendedores apertando a mão de um cliente",
          altura: 604,
          largura: 900,
          url: "/capas/comercial.jpg",
        },
        slug: "comercial",
        titulo: "Profills School Comercial",
      },
      modulo: { numero: 8, titulo: "Pilar Urgência" },
      progresso: { feitas: 46, pct: 51, total: 90 },
      proximoNivel: "Consultor Comercial Profills",
      tipo: "continuar",
    });
  });

  test("Fábrica e montagem é um curso só, com os 3 módulos e as 7 aulas", () => {
    const fabrica = prototipo().cursos.find(
      (c) => c.slug === "fabrica-montagem"
    );
    expect(fabrica).toMatchObject({
      aulas: 7,
      duracaoSeg: 4438,
      progresso: { feitas: 0, pct: 0, total: 7 },
      titulo: "Fábrica e montagem",
    });
  });

  test("o código do curso e o comunicado do exemplo chegam à tela", () => {
    const painel = prototipo();
    expect(painel.cursos[1]?.codigo).toBe("POP-COM-001");
    expect(painel.comunicado?.titulo).toBe(
      "Exemplo: Módulo 13 atualizado com o novo cadastro de atendimentos do CRM"
    );
  });
});

describe("montarPainel com regras de liberação", () => {
  const a = cursoLinha("a", { aulas: [2] });

  test("os cinco estados, liberados na ordem inversa, saem na ordem da tela", () => {
    const quando = em("2026-08-01T00:00:00Z");
    const liberados = [
      cursoLinha("concluido", { aulas: [1] }),
      cursoLinha("em-breve", { aulas: [1], status: "em_producao" }),
      cursoLinha("nao-iniciado", { aulas: [1] }),
      cursoLinha("questionarios", { aulas: [1], perguntas: 1 }),
      cursoLinha("em-andamento", { aulas: [2] }),
    ];
    const painel = montar(
      linhas({
        assistidas: [
          { assistidaEm: quando, aulaId: idAula("questionarios", 0, 1) },
          { assistidaEm: quando, aulaId: idAula("em-andamento", 0, 1) },
        ],
        certificados: [
          { codigo: "CERT-1", cursoId: "concluido", emitidoEm: quando },
        ],
        liberacoes: liberados.map((curso) => ({ curso, liberadaEm: quando })),
      })
    );
    expect(painel.cursos.map((c) => [c.slug, c.estado.tipo])).toEqual([
      ["em-andamento", "em_andamento"],
      ["questionarios", "questionarios"],
      ["nao-iniciado", "nao_iniciado"],
      ["em-breve", "em_breve"],
      ["concluido", "concluido"],
    ]);
  });

  test("o módulo da capa é o da aula para onde o Continuar leva, não o primeiro com aula pendente", () => {
    // Módulo 0 com 2 aulas e módulo 1 com 1: a pessoa viu a aula 1 do módulo 0 e
    // parou depois na aula 1 do módulo 1.
    const e = cursoLinha("e", { aulas: [2, 1] });
    const painel = montar(
      linhas({
        assistidas: [
          {
            assistidaEm: em("2026-10-08T15:00:00Z"),
            aulaId: idAula("e", 0, 1),
          },
        ],
        liberacoes: [{ curso: e, liberadaEm: em("2026-10-01T15:00:00Z") }],
        posicoes: [
          {
            atualizadaEm: em("2026-10-09T15:00:00Z"),
            aulaId: idAula("e", 1, 1),
            posicaoSeg: 120,
          },
        ],
      })
    );
    expect([
      painel.cursos[0]?.moduloAtual?.numero,
      painel.retomada?.tipo === "continuar"
        ? painel.retomada.modulo.numero
        : null,
    ]).toEqual([1, 1]);
  });

  test("curso em produção não abre e não vira retomada", () => {
    const breve = cursoLinha("breve", { aulas: [2], status: "em_producao" });
    const painel = montar(
      linhas({
        liberacoes: [{ curso: breve, liberadaEm: em("2026-08-01T00:00:00Z") }],
      })
    );
    expect(painel.cursos.map((c) => [c.slug, c.estado.tipo])).toEqual([
      ["breve", "em_breve"],
    ]);
    expect(painel.retomada).toBeNull();
  });

  test("comunicado de curso sem liberação não aparece", () => {
    const painel = montar(
      linhas({
        comunicados: [
          {
            cursoId: "x",
            id: "novo",
            publicadoEm: em("2026-10-05T12:00:00Z"),
            texto: "t",
            titulo: "De curso alheio",
          },
          {
            cursoId: "a",
            id: "meu",
            publicadoEm: em("2026-10-04T12:00:00Z"),
            texto: "t",
            titulo: "Do curso a",
          },
          {
            cursoId: null,
            id: "geral",
            publicadoEm: em("2026-10-03T12:00:00Z"),
            texto: "t",
            titulo: "Geral",
          },
        ],
        liberacoes: [{ curso: a, liberadaEm: em("2026-08-02T00:00:00Z") }],
      })
    );
    expect(painel.comunicado?.titulo).toBe("Do curso a");
    expect(painel.comunicado?.publicadoEm).toBe("2026-10-04T12:00:00.000Z");
  });

  test("zero liberações dá lista vazia e retomada nula", () => {
    const painel = montar(
      linhas({
        posicoes: [
          {
            atualizadaEm: em("2026-10-07T12:00:00Z"),
            aulaId: idAula("a", 0, 1),
            posicaoSeg: 40,
          },
        ],
      })
    );
    expect(painel).toEqual({ comunicado: null, cursos: [], retomada: null });
  });
});

describe("lugar do comunicado em Meus cursos", () => {
  const HOJE = "2026-10-15" as DiaISO;
  const lugar = (publicadoEm: string) =>
    montar(
      linhas({
        comunicados: [
          {
            cursoId: null,
            id: "geral",
            publicadoEm: em(publicadoEm),
            texto: "t",
            titulo: "Geral",
          },
        ],
      }),
      HOJE
    ).comunicado?.lugar;

  test("publicado hoje fica no topo", () => {
    expect(lugar("2026-10-15T13:00:00Z")).toBe("topo");
  });

  test("com 13 dias corridos fica no topo, com 14 desce para o fim", () => {
    expect(lugar("2026-10-02T15:00:00Z")).toBe("topo");
    expect(lugar("2026-10-01T15:00:00Z")).toBe("fim");
  });

  test("os dias contam no fuso de São Paulo, não em UTC", () => {
    // 02/10 às 02:00 UTC ainda é 01/10 às 23:00 em São Paulo: 14 dias.
    expect(lugar("2026-10-02T02:00:00Z")).toBe("fim");
    // 02/10 às 03:00 UTC já é meia-noite de 02/10 em São Paulo: 13 dias.
    expect(lugar("2026-10-02T03:00:00Z")).toBe("topo");
  });

  test("o comunicado do exemplo, de 6 dias, fica no topo", () => {
    expect(montar(exemploDoPrototipo()).comunicado?.lugar).toBe("topo");
  });
});
