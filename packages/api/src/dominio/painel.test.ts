import { describe, expect, test } from "bun:test";

import {
  aulasDe,
  cursoLinha,
  exemploDoPrototipo,
  HOJE_DO_EXEMPLO,
  idAula,
  SEM_LIBERACAO,
} from "./exemplo";
import { type CursoLinha, type LinhasPainel, montarPainel } from "./painel";
import type { DiaISO } from "./tipos";

const em = (iso: string) => new Date(iso);

const montar = (l: LinhasPainel, hoje: DiaISO = HOJE_DO_EXEMPLO) =>
  montarPainel(l, hoje);

const trilhaLinha = (chave: string, cursos: CursoLinha[]) => ({
  cursos: cursos.map((curso, i) => ({ curso, posicao: i + 1 })),
  descricao: `Descrição de ${chave}`,
  id: chave,
  slug: chave,
  titulo: `Trilha ${chave}`,
});

const linhas = (o: Partial<LinhasPainel>): LinhasPainel => ({
  ...SEM_LIBERACAO,
  ...o,
});

describe("montarPainel com o caso do protótipo", () => {
  const prototipo = () => montar(exemploDoPrototipo());

  test("trilha Formação comercial dá 51% e o curso da vez é o Comercial", () => {
    const painel = prototipo();
    const [formacao] = painel.trilhas;
    expect(formacao?.titulo).toBe("Formação comercial");
    expect(formacao?.aulas).toEqual({ feitas: 46, pct: 51, total: 90 });
    expect(formacao?.daVez?.slug).toBe("comercial");
    expect(formacao?.daVez?.moduloAtual).toEqual({
      numero: 8,
      titulo: "Pilar Urgência",
    });
    expect(painel.retomada).toMatchObject({
      aula: {
        faltaSeg: 412,
        numeroNoModulo: 4,
        posicaoSeg: 222,
        titulo: "Cronograma reverso",
      },
      modulo: { numero: 8, titulo: "Pilar Urgência" },
      progresso: { feitas: 46, pct: 51, total: 90 },
      proximoNivel: "Consultor Comercial Profills",
      tipo: "continuar",
      trilha: { titulo: "Formação comercial" },
    });
  });

  test("trilha Fábrica e montagem dá nao_iniciado, em_breve, em_breve e conta só as 3 aulas do curso publicado", () => {
    const [, fabrica] = prototipo().trilhas;
    expect(fabrica?.cursos.map((c) => c.estado.tipo)).toEqual([
      "nao_iniciado",
      "em_breve",
      "em_breve",
    ]);
    expect(fabrica?.aulas).toEqual({ feitas: 0, pct: 0, total: 3 });
    expect(fabrica?.cursos[0]?.primeiroModulo).toEqual({
      aulas: 3,
      duracaoSeg: 1902,
      titulo: "Segurança da máquina",
    });
    expect(fabrica?.situacao).toBe("em_curso");
  });

  test("soltos saem na ordem nova rotina, gravação, autoavaliação", () => {
    const painel = prototipo();
    expect(painel.soltos.map((c) => [c.slug, c.estado.tipo])).toEqual([
      ["nova-rotina", "em_andamento"],
      ["gravacao", "nao_iniciado"],
      ["autoavaliacao", "concluido"],
    ]);
    expect(painel.soltos[0]?.extra).toBe("POP-COM-001");
    expect(painel.comunicado?.titulo).toBe(
      "Exemplo: Módulo 13 atualizado com o novo cadastro de atendimentos do CRM"
    );
  });
});

describe("montarPainel com regras de liberação", () => {
  const a = cursoLinha("a", { aulas: [2] });
  const b = cursoLinha("b", { aulas: [2] });

  test("curso com liberação direta e trilha liberada aparece uma vez, sem bloqueio", () => {
    const painel = montar(
      linhas({
        liberacoes: [
          {
            curso: null,
            liberadaEm: em("2026-08-01T00:00:00Z"),
            trilha: trilhaLinha("t", [a, b]),
          },
          { curso: b, liberadaEm: em("2026-08-02T00:00:00Z"), trilha: null },
        ],
      })
    );
    expect(painel.soltos).toHaveLength(0);
    expect(
      painel.trilhas[0]?.cursos.map((c) => [c.slug, c.estado.tipo])
    ).toEqual([
      ["a", "nao_iniciado"],
      ["b", "nao_iniciado"],
    ]);
  });

  test("o módulo do cartão da trilha é o da aula para onde o Continuar leva, não o primeiro com aula pendente", () => {
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
        liberacoes: [
          {
            curso: null,
            liberadaEm: em("2026-10-01T15:00:00Z"),
            trilha: trilhaLinha("t", [e]),
          },
        ],
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
      painel.trilhas[0]?.daVez?.moduloAtual?.numero,
      painel.retomada?.tipo === "continuar"
        ? painel.retomada.modulo.numero
        : null,
    ]).toEqual([1, 1]);
  });

  test("curso com liberação direta fora de trilha liberada vai para soltos", () => {
    const painel = montar(
      linhas({
        liberacoes: [
          { curso: b, liberadaEm: em("2026-08-02T00:00:00Z"), trilha: null },
        ],
      })
    );
    expect(painel.trilhas).toHaveLength(0);
    expect(painel.soltos.map((c) => [c.slug, c.estado.tipo])).toEqual([
      ["b", "nao_iniciado"],
    ]);
  });

  test("trilha com os cursos seguintes em produção fica aguardando_producao", () => {
    const breve = cursoLinha("breve", { aulas: [2], status: "em_producao" });
    const painel = montar(
      linhas({
        assistidas: aulasDe(a).map((aulaId) => ({
          assistidaEm: em("2026-09-01T12:00:00Z"),
          aulaId,
        })),
        certificados: [
          {
            codigo: "C-A",
            cursoId: "a",
            emitidoEm: em("2026-09-02T12:00:00Z"),
          },
        ],
        liberacoes: [
          {
            curso: null,
            liberadaEm: em("2026-08-01T00:00:00Z"),
            trilha: trilhaLinha("t", [a, breve]),
          },
        ],
      })
    );
    expect(painel.trilhas[0]).toMatchObject({
      concluidos: 1,
      daVez: null,
      situacao: "aguardando_producao",
    });
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
        liberacoes: [
          { curso: a, liberadaEm: em("2026-08-02T00:00:00Z"), trilha: null },
        ],
      })
    );
    expect(painel.comunicado?.titulo).toBe("Do curso a");
    expect(painel.comunicado?.publicadoEm).toBe("2026-10-04T12:00:00.000Z");
  });

  test("zero liberações dá listas vazias e retomada nula", () => {
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
    expect(painel).toEqual({
      comunicado: null,
      retomada: null,
      soltos: [],
      trilhas: [],
    });
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
