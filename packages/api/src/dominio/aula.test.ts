import { describe, expect, test } from "bun:test";

import {
  abreAAula,
  aulaPorId,
  type CursoComAcessoLinha,
  inicioDaAula,
  type LinhasCurso,
  montarAulaNoPlayer,
  montarCursoAberto,
  montarCursoVisto,
} from "./aula";
import { podeAbrir } from "./curso";
import {
  cursoLinha,
  exemploDoPrototipo,
  HOJE_DO_EXEMPLO,
  idAula,
} from "./exemplo";
import { type CursoLinha, montarPainel } from "./painel";
import type { AulaId } from "./tipos";

const em = (iso: string) => new Date(iso);
const LIBERADA = [{ id: "lib" }];

function comAcesso(
  linha: CursoLinha,
  a: { liberado: boolean; peloPerfil?: boolean }
): CursoComAcessoLinha {
  return {
    ...linha,
    liberacoes: a.liberado ? LIBERADA : [],
    liberacoesDoPerfil: a.peloPerfil ? LIBERADA : [],
    precoTroca: null,
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
  questionarios: o.questionarios ?? [],
});

const SEM_QUESTIONARIO = { perguntas: [], tentativas: [] };

const assistida = (aulaId: string, dia = "2026-10-06") => ({
  assistidaEm: em(`${dia}T15:00:00Z`),
  aulaId,
  dia,
});

describe("montarCursoAberto", () => {
  const a = cursoLinha("a", { aulas: [2] });

  test("sem liberação ativa, null", () => {
    expect(
      montarCursoAberto(linhas(comAcesso(a, { liberado: false })))
    ).toBeNull();
  });

  test("só com a liberação do perfil, o curso é amostra: só a primeira aula abre", () => {
    const visto = montarCursoVisto(
      linhas(comAcesso(a, { liberado: false, peloPerfil: true }))
    );
    expect(visto?.amostra).toEqual({
      aulaId: idAula("a", 0, 1) as AulaId,
      preco: null,
    });
    expect(
      montarCursoAberto(
        linhas(comAcesso(a, { liberado: false, peloPerfil: true }))
      )
    ).toBeNull();
    if (!visto) {
      throw new Error("a amostra abriu");
    }
    expect(abreAAula(visto, idAula("a", 0, 1))).toBe(true);
    expect(abreAAula(visto, idAula("a", 0, 2))).toBe(false);
  });

  test("a liberação própria vence a do perfil: o curso inteiro abre", () => {
    const visto = montarCursoVisto(
      linhas(comAcesso(a, { liberado: true, peloPerfil: true }))
    );
    expect(visto?.amostra).toBeNull();
    expect(visto && abreAAula(visto, idAula("a", 0, 2))).toBe(true);
  });

  test("o curso concluído que ficou sem aula abre inteiro, e a amostra dele não existe", () => {
    // O certificado vence a falta de aula (concluido), como antes da amostra.
    const vazio = cursoLinha("vazio", { aulas: [0] });
    const certificados = [
      {
        codigo: "RI-001",
        cursoId: vazio.id,
        emitidoEm: em("2026-10-06T15:00:00Z"),
      },
    ];
    const inteiro = montarCursoAberto(
      linhas(comAcesso(vazio, { liberado: true, peloPerfil: true }), {
        certificados,
      })
    );
    expect(inteiro?.amostra).toBeNull();
    expect(inteiro?.leitura.estado.tipo).toBe("concluido");
    expect(
      montarCursoVisto(
        linhas(comAcesso(vazio, { liberado: false, peloPerfil: true }), {
          certificados,
        })
      )
    ).toBeNull();
  });

  test("com liberação ativa, o curso abre no estado dele", () => {
    expect(
      montarCursoAberto(linhas(comAcesso(a, { liberado: true })))?.leitura
        .estado
    ).toEqual({
      primeiraAula: idAula("a", 0, 1) as AulaId,
      tipo: "nao_iniciado",
    });
  });

  test("curso em_breve não abre", () => {
    const breve = cursoLinha("breve", { aulas: [2], status: "em_producao" });
    expect(
      montarCursoAberto(linhas(comAcesso(breve, { liberado: true })))
    ).toBeNull();
  });

  test("slug que não existe, null", () => {
    expect(montarCursoAberto(linhas(null))).toBeNull();
  });

  test("o estado bate com o do painel para cada curso do exemplo", () => {
    const exemplo = exemploDoPrototipo();
    const painel = montarPainel(exemplo, HOJE_DO_EXEMPLO);
    expect(painel.cursos.length).toBeGreaterThan(3);
    for (const vm of painel.cursos) {
      const linha = exemplo.liberacoes.find((l) => l.curso.id === vm.id)?.curso;
      if (!linha) {
        throw new Error(`curso ${vm.slug} sem linha`);
      }
      const aberto = montarCursoAberto({
        assistidas: exemplo.assistidas.map((x) => ({
          ...x,
          dia: "2026-09-01",
        })),
        certificados: exemplo.certificados,
        curso: comAcesso(linha, { liberado: true }),
        posicoes: exemplo.posicoes.map((p) => ({ ...p, trechosVistos: [] })),
        questionarios: [],
      });
      expect(aberto?.leitura.estado ?? null).toEqual(
        podeAbrir(vm.estado) ? vm.estado : null
      );
    }
  });
});

describe("montarAulaNoPlayer", () => {
  const c = cursoLinha("c", { aulas: [2, 3], duracaoSeg: 600 });
  const aberto = montarCursoAberto(
    linhas(comAcesso(c, { liberado: true }), {
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
    return montarAulaNoPlayer(aberto, aula, SEM_QUESTIONARIO, 0);
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

  test("a aula leva a descrição que o admin escreveu, e a sem descrição leva vazio", () => {
    const comDescricao: CursoLinha = {
      ...c,
      modulos: c.modulos.map((m, i) => ({
        ...m,
        aulas: m.aulas.map((a, j) =>
          i === 1 && j === 0 ? { ...a, descricao: "Troca do bico." } : a
        ),
      })),
    };
    const e = montarCursoAberto(
      linhas(comAcesso(comDescricao, { liberado: true }))
    );
    const descricao = (id: string) => {
      const aula = e && aulaPorId(e, id);
      return e && aula
        ? montarAulaNoPlayer(e, aula, SEM_QUESTIONARIO, 0).aula.descricao
        : null;
    };
    expect([
      descricao(idAula("c", 1, 1)),
      descricao(idAula("c", 1, 2)),
    ]).toEqual(["Troca do bico.", ""]);
  });

  test("aula de outro curso não está no curso aberto", () => {
    expect(aulaPorId(aberto, idAula("outro", 0, 1))).toBeNull();
  });

  test("aula N de M segue a ordem da coluna, mesmo com buraco na posição", () => {
    const base = cursoLinha("d", { aulas: [3] });
    const posicoes = [1, 3, 7];
    const comBuraco: CursoLinha = {
      ...base,
      modulos: base.modulos.map((m) => ({
        ...m,
        aulas: m.aulas.map((a, i) => ({ ...a, posicao: posicoes[i] ?? 0 })),
      })),
    };
    const d = montarCursoAberto(
      linhas(comAcesso(comBuraco, { liberado: true }))
    );
    const ultima = d && aulaPorId(d, idAula("d", 0, 3));
    if (!(d && ultima)) {
      throw new Error("curso d não abriu");
    }
    expect(
      montarAulaNoPlayer(d, ultima, SEM_QUESTIONARIO, 0).aula
    ).toMatchObject({
      numeroNoModulo: 3,
      totalNoModulo: 3,
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
