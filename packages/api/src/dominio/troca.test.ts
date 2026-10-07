import { describe, expect, test } from "bun:test";
import type { CursoId, DiaISO } from "./tipos";
import {
  type Acesso,
  type CursoDaTroca,
  cartao,
  decidirTroca,
  type LinhaDoCursoDaTroca,
  montarPainelDeTroca,
  paraCursoDaTroca,
  situacao,
} from "./troca";

const HOJE = "2026-10-07" as DiaISO;
const TROCADO: Acesso = {
  lancamentoId: "lanc-1",
  pago: 300,
  tipo: "trocado",
  trocadoEm: "2026-10-01" as DiaISO,
};

const curso = (mudar: Partial<CursoDaTroca> = {}): CursoDaTroca => ({
  acesso: { tipo: "nenhum" },
  aulas: 4,
  capa: { alt: "Capa", url: "/capas/bpf.jpg" },
  duracaoSeg: 2400,
  id: "c-1" as CursoId,
  precoTroca: 500,
  slug: "bpf",
  status: "publicado",
  tema: "Processo de envase",
  titulo: "Boas práticas de fabricação",
  ...mudar,
});

describe("situacao", () => {
  test("curso com preço, publicado e com aula está à venda", () => {
    expect(situacao(curso())).toEqual({ preco: 500, tipo: "a_venda" });
  });

  test("sem preço, em produção ou sem aula fica fora", () => {
    for (const c of [
      curso({ precoTroca: null }),
      curso({ status: "em_producao" }),
      curso({ aulas: 0 }),
    ]) {
      expect(situacao(c)).toEqual({ tipo: "fora" });
    }
  });

  test("liberação do admin ou trilha liberada dá ja_tem, mesmo com preço", () => {
    for (const tipo of ["liberado", "na_trilha"] as const) {
      expect(situacao(curso({ acesso: { tipo } }))).toEqual({
        tipo: "ja_tem",
      });
    }
  });

  test("trocado vence tudo, mesmo depois de o admin tirar o preço", () => {
    expect(situacao(curso({ acesso: TROCADO, precoTroca: null }))).toEqual(
      TROCADO
    );
  });
});

describe("cartao", () => {
  test("saldo igual ao preço pode trocar", () => {
    expect(cartao(curso(), 500)?.tipo).toBe("pode_trocar");
  });

  test("saldo menor mostra quanto falta e a porcentagem arredondada para baixo", () => {
    expect(cartao(curso(), 333)).toMatchObject({
      faltam: 167,
      pct: 66,
      preco: 500,
      saldo: 333,
      tipo: "faltam",
    });
  });

  test("trocado mostra o preço pago, não o atual", () => {
    expect(
      cartao(curso({ acesso: TROCADO, precoTroca: 900 }), 0)
    ).toMatchObject({ pago: 300, tipo: "trocado", trocadoEm: "2026-10-01" });
  });

  test("fora e ja_tem não entram na vitrine", () => {
    expect(cartao(curso({ precoTroca: null }), 1000)).toBeNull();
    expect(cartao(curso({ acesso: { tipo: "liberado" } }), 1000)).toBeNull();
  });
});

describe("decidirTroca", () => {
  test("curso inexistente ou fora da troca é indisponível", () => {
    const indisponivel = {
      recusa: { tipo: "indisponivel" },
      tipo: "recusa",
    } as const;
    expect(decidirTroca(null, 1000, 500)).toEqual(indisponivel);
    expect(decidirTroca(curso({ precoTroca: null }), 1000, 500)).toEqual(
      indisponivel
    );
  });

  test("curso já trocado devolve a mesma troca, ignorando preço visto e saldo", () => {
    const c = curso({ acesso: TROCADO });
    expect(decidirTroca(c, 0, 1)).toEqual({
      curso: c,
      lancamentoId: "lanc-1",
      tipo: "ja_trocado",
    });
  });

  test("curso liberado pelo admin ou na trilha é recusado como ja_tem", () => {
    expect(
      decidirTroca(curso({ acesso: { tipo: "na_trilha" } }), 1000, 500)
    ).toEqual({ recusa: { tipo: "ja_tem" }, tipo: "recusa" });
  });

  test("preço diferente do visto é recusado antes do saldo", () => {
    expect(decidirTroca(curso({ precoTroca: 800 }), 0, 500)).toEqual({
      recusa: { preco: 800, tipo: "preco_mudou" },
      tipo: "recusa",
    });
  });

  test("saldo curto diz quanto falta", () => {
    expect(decidirTroca(curso(), 420, 500)).toEqual({
      recusa: { faltam: 80, tipo: "saldo_curto" },
      tipo: "recusa",
    });
  });

  test("preço igual ao visto e saldo suficiente debita o preço", () => {
    const c = curso();
    expect(decidirTroca(c, 500, 500)).toEqual({
      curso: c,
      preco: 500,
      tipo: "debitar",
    });
  });
});

const linha = (
  mudar: Partial<LinhaDoCursoDaTroca> = {}
): LinhaDoCursoDaTroca => ({
  capaAlt: "Capa",
  capaUrl: "/capas/bpf.jpg",
  id: "c-1",
  liberacoes: [],
  modulos: [
    { aulas: [{ duracaoSeg: 600 }, { duracaoSeg: 300 }] },
    { aulas: [{ duracaoSeg: 60 }] },
  ],
  naTrilha: null,
  precoTroca: 500,
  slug: "bpf",
  status: "publicado",
  tema: "Processo de envase",
  titulo: "Boas práticas de fabricação",
  ...mudar,
});

describe("paraCursoDaTroca", () => {
  test("conta aulas e soma a duração de todos os módulos", () => {
    expect(paraCursoDaTroca(linha())).toMatchObject({
      acesso: { tipo: "nenhum" },
      aulas: 3,
      duracaoSeg: 960,
    });
  });

  test("liberação com lançamento de troca vira trocado, com o dia de São Paulo", () => {
    const c = paraCursoDaTroca(
      linha({
        liberacoes: [
          {
            liberadaEm: new Date("2026-10-07T02:00:00Z"),
            trocaLancamento: { id: "lanc-9", pontos: -200 },
          },
        ],
      })
    );
    expect(c.acesso).toEqual({
      lancamentoId: "lanc-9",
      pago: 200,
      tipo: "trocado",
      trocadoEm: "2026-10-06" as DiaISO,
    });
  });

  test("liberação sem lançamento é do admin; trilha liberada dá na_trilha", () => {
    const direta = {
      liberadaEm: new Date(),
      trocaLancamento: null,
    };
    expect(paraCursoDaTroca(linha({ liberacoes: [direta] })).acesso.tipo).toBe(
      "liberado"
    );
    expect(
      paraCursoDaTroca(linha({ naTrilha: { trilha: { liberacoes: [{}] } } }))
        .acesso.tipo
    ).toBe("na_trilha");
    expect(
      paraCursoDaTroca(linha({ naTrilha: { trilha: { liberacoes: [] } } }))
        .acesso.tipo
    ).toBe("nenhum");
  });
});

describe("montarPainelDeTroca", () => {
  test("ordena por preço (o pago no trocado) e título, e esconde fora e ja_tem", () => {
    const painel = montarPainelDeTroca(
      {
        cursos: [
          curso({ id: "caro" as CursoId, precoTroca: 1000, titulo: "Caro" }),
          curso({ id: "b" as CursoId, precoTroca: 300, titulo: "Bê" }),
          curso({
            acesso: TROCADO,
            id: "trocado" as CursoId,
            precoTroca: 2000,
            titulo: "Trocado",
          }),
          curso({ id: "a" as CursoId, precoTroca: 300, titulo: "Á" }),
          curso({ id: "fora" as CursoId, precoTroca: null }),
          curso({ acesso: { tipo: "liberado" }, id: "tem" as CursoId }),
        ],
        extrato: [],
        pontos: { saldo: 410, semana: 40 },
      },
      HOJE
    );
    expect(painel.cartoes.map((c) => [String(c.curso.id), c.tipo])).toEqual([
      ["a", "pode_trocar"],
      ["b", "pode_trocar"],
      ["trocado", "trocado"],
      ["caro", "faltam"],
    ]);
    expect(painel).toMatchObject({
      hoje: HOJE,
      pontosSemana: 40,
      saldo: 410,
    });
  });
});
