import { describe, expect, test } from "bun:test";

import {
  aulaPorId,
  type CursoComAcessoLinha,
  entradaDoCurso,
  inicioDaAula,
  type LinhasCurso,
  montarAulaNoPlayer,
  montarCursoAberto,
} from "./aula";
import { abre } from "./curso";
import { cursoLinha, exemploDoPrototipo, idAula } from "./exemplo";
import { type CursoLinha, montarPainel } from "./painel";

const em = (iso: string) => new Date(iso);
const LIBERADA = [{ id: "lib" }];

interface Acesso {
  direto?: boolean;
  trilha?: { cursos: CursoLinha[]; liberada: boolean };
}

function comAcesso(linha: CursoLinha, a: Acesso): CursoComAcessoLinha {
  return {
    ...linha,
    liberacoes: a.direto ? LIBERADA : [],
    naTrilha: a.trilha
      ? {
          trilha: {
            cursos: a.trilha.cursos.map((curso, i) => ({
              curso,
              posicao: i + 1,
            })),
            descricao: "teste",
            id: "t",
            liberacoes: a.trilha.liberada ? LIBERADA : [],
            slug: "t",
            titulo: "Trilha t",
          },
        }
      : null,
  };
}

const linhas = (
  curso: CursoComAcessoLinha | null,
  o: Partial<Omit<LinhasCurso, "curso">> = {}
): LinhasCurso => ({
  assistidas: o.assistidas ?? [],
  certificados: o.certificados ?? [],
  curso,
  posicoes: o.posicoes ?? [],
});

const assistida = (aulaId: string, dia = "2026-10-06") => ({
  assistidaEm: em(`${dia}T15:00:00Z`),
  aulaId,
  dia,
});

describe("montarCursoAberto", () => {
  const a = cursoLinha("a", { aulas: [2] });
  const b = cursoLinha("b", { aulas: [2] });

  test("sem liberação ativa, null", () => {
    expect(montarCursoAberto(linhas(comAcesso(a, {})))).toBeNull();
    expect(
      montarCursoAberto(
        linhas(comAcesso(a, { trilha: { cursos: [a, b], liberada: false } }))
      )
    ).toBeNull();
  });

  test("curso em_breve não abre", () => {
    const breve = cursoLinha("breve", { aulas: [2], status: "em_producao" });
    expect(
      montarCursoAberto(linhas(comAcesso(breve, { direto: true })))
    ).toBeNull();
  });

  test("curso bloqueado na trilha não abre, e a liberação direta o solta", () => {
    const trilha = { cursos: [a, b], liberada: true };
    expect(montarCursoAberto(linhas(comAcesso(b, { trilha })))).toBeNull();
    expect(
      montarCursoAberto(linhas(comAcesso(b, { direto: true, trilha })))?.estado
        .tipo
    ).toBe("nao_iniciado");
  });

  test("slug que não existe, null", () => {
    expect(montarCursoAberto(linhas(null))).toBeNull();
  });

  test("o estado bate com o do painel para cada curso do exemplo", () => {
    const exemplo = exemploDoPrototipo();
    const painel = montarPainel(exemplo);
    const telas = [
      ...painel.trilhas.flatMap((t) => t.cursos),
      ...painel.soltos,
    ];
    expect(telas.length).toBeGreaterThan(3);
    for (const vm of telas) {
      const lib = exemplo.liberacoes;
      const trilha = lib.find((l) =>
        l.trilha?.cursos.some((c) => c.curso.id === vm.id)
      )?.trilha;
      const linha =
        lib.find((l) => l.curso?.id === vm.id)?.curso ??
        trilha?.cursos.find((c) => c.curso.id === vm.id)?.curso;
      if (!linha) {
        throw new Error(`curso ${vm.slug} sem linha`);
      }
      const aberto = montarCursoAberto({
        assistidas: exemplo.assistidas.map((x) => ({
          ...x,
          dia: "2026-09-01",
        })),
        certificados: exemplo.certificados,
        curso: comAcesso(linha, {
          direto: lib.some((l) => l.curso?.id === vm.id),
          trilha: trilha
            ? { cursos: trilha.cursos.map((c) => c.curso), liberada: true }
            : undefined,
        }),
        posicoes: exemplo.posicoes.map((p) => ({ ...p, trechosVistos: [] })),
      });
      expect(aberto?.estado ?? null).toEqual(
        abre(vm.estado) ? vm.estado : null
      );
    }
  });
});

describe("montarAulaNoPlayer", () => {
  const c = cursoLinha("c", { aulas: [2, 3], duracaoSeg: 600 });
  const aberto = montarCursoAberto(
    linhas(comAcesso(c, { direto: true }), {
      assistidas: [assistida(idAula("c", 0, 1))],
      posicoes: [
        {
          atualizadaEm: em("2026-10-07T12:00:00Z"),
          aulaId: idAula("c", 0, 2),
          posicaoSeg: 300,
          trechosVistos: [
            { fim: 300, inicio: 0 },
            { fim: 320, inicio: 290 },
          ],
        },
      ],
    })
  );
  if (!aberto) {
    throw new Error("curso c não abriu");
  }
  const vm = (id: string) => {
    const aula = aulaPorId(aberto, id);
    if (!aula) {
      throw new Error(`aula ${id} fora do curso`);
    }
    return montarAulaNoPlayer(aberto, aula);
  };

  test("anterior e próxima atravessam módulos", () => {
    const ultimaDoM0 = vm(idAula("c", 0, 2));
    expect(String(ultimaDoM0.proxima?.id)).toBe(idAula("c", 1, 1));
    expect(String(vm(idAula("c", 1, 1)).anterior?.id)).toBe(idAula("c", 0, 2));
    expect(vm(idAula("c", 0, 1)).anterior).toBeNull();
    expect(vm(idAula("c", 1, 3)).proxima).toBeNull();
  });

  test("o estudo traz posição, trechos canônicos e assistida", () => {
    expect(vm(idAula("c", 0, 2)).estudo).toEqual({
      assistida: false,
      posicaoSeg: 300,
      trechos: [{ fim: 320, inicio: 0 }] as never,
    });
    expect(vm(idAula("c", 0, 1)).estudo.assistida).toBe(true);
  });

  test("a coluna abre o módulo atual e conta as feitas", () => {
    const { modulos, aula } = vm(idAula("c", 1, 2));
    expect(modulos.map((m) => [m.numero, m.atual, m.feitas])).toEqual([
      [0, false, 1],
      [1, true, 0],
    ]);
    expect(aula).toMatchObject({ numeroNoModulo: 2, totalNoModulo: 3 });
  });

  test("aula de outro curso não está no curso aberto", () => {
    expect(aulaPorId(aberto, idAula("outro", 0, 1))).toBeNull();
  });
});

describe("entradaDoCurso", () => {
  const c = cursoLinha("c", { aulas: [3] });

  test("não iniciado leva à primeira aula", () => {
    const aberto = montarCursoAberto(linhas(comAcesso(c, { direto: true })));
    expect(aberto && entradaDoCurso(aberto)).toEqual({
      aulaId: idAula("c", 0, 1) as never,
      tipo: "aula",
    });
  });

  test("em andamento leva à última aula tocada que não foi assistida", () => {
    const aberto = montarCursoAberto(
      linhas(comAcesso(c, { direto: true }), {
        assistidas: [assistida(idAula("c", 0, 1))],
        posicoes: [
          {
            atualizadaEm: em("2026-10-07T12:00:00Z"),
            aulaId: idAula("c", 0, 3),
            posicaoSeg: 40,
            trechosVistos: [],
          },
        ],
      })
    );
    expect(aberto && entradaDoCurso(aberto)).toEqual({
      aulaId: idAula("c", 0, 3) as never,
      tipo: "aula",
    });
  });

  test("todas assistidas: prova, com a primeira aula para rever", () => {
    const aberto = montarCursoAberto(
      linhas(comAcesso(c, { direto: true }), {
        assistidas: [1, 2, 3].map((p) => assistida(idAula("c", 0, p))),
      })
    );
    expect(aberto && entradaDoCurso(aberto)).toEqual({
      primeira: idAula("c", 0, 1) as never,
      tipo: "prova",
    });
  });
});

describe("inicioDaAula", () => {
  test("posição no meio abre nela", () => {
    expect(inicioDaAula({ assistida: false, posicaoSeg: 300 }, 600)).toBe(300);
  });

  test("posição a menos de 10 s do fim, ou aula já assistida, abre no 0", () => {
    expect(inicioDaAula({ assistida: false, posicaoSeg: 591 }, 600)).toBe(0);
    expect(inicioDaAula({ assistida: false, posicaoSeg: 589 }, 600)).toBe(589);
    expect(inicioDaAula({ assistida: true, posicaoSeg: 300 }, 600)).toBe(0);
  });

  test("sem posição abre no 0", () => {
    expect(inicioDaAula({ assistida: false, posicaoSeg: 0 }, 600)).toBe(0);
  });
});
