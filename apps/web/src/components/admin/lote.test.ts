import { describe, expect, test } from "bun:test";
import type { PessoaComSituacao } from "@cursos/api/dominio/acompanhamento";
import type { ResultadoDoLote } from "@cursos/api/dominio/liberacao";
import type { CursoId, DiaISO, Pessoa } from "@cursos/api/dominio/tipos";

import {
  detalheDoResultado,
  type EstadoDoLote,
  type EventoDoLote,
  emOrdemDoResultado,
  jaTem,
  LOTE_VAZIO,
  lote,
  prontoParaLiberar,
  resumoDoResultado,
  rotuloDoLiberar,
} from "./lote";

const HOJE = "2026-10-16" as DiaISO;
const pessoa = (userId: string, nome: string): Pessoa => ({
  email: `${userId}@exemplo.com`,
  foto: null,
  nome,
  userId,
});
const ANA = pessoa("user_ana", "Ana Beatriz Lima");
const CAMILA = pessoa("user_camila", "Camila Rocha");
const LUANA = pessoa("user_luana", "Luana Ferreira");
const COMERCIAL = {
  id: "11111111-1111-4111-8111-111111111111" as CursoId,
  titulo: "Profills School Comercial",
};

const rodar = (...eventos: EventoDoLote[]) => eventos.reduce(lote, LOTE_VAZIO);

const marcadasDe = (e: EstadoDoLote) => e.marcadas.map((p) => p.nome);

describe("a seleção", () => {
  test("guarda na ordem em que o admin marcou, sem repetir", () => {
    const e = rodar(
      { pessoa: CAMILA, tipo: "marcar" },
      { pessoa: ANA, tipo: "marcar" },
      { pessoa: CAMILA, tipo: "marcar" }
    );
    expect(marcadasDe(e)).toEqual(["Camila Rocha", "Ana Beatriz Lima"]);
  });

  test("o X tira uma, e Desmarcar todas tira as outras", () => {
    const tres = [ANA, CAMILA, LUANA].map(
      (p): EventoDoLote => ({ pessoa: p, tipo: "marcar" })
    );
    const semCamila = rodar(...tres, {
      tipo: "desmarcar",
      userId: CAMILA.userId,
    });
    expect(marcadasDe(semCamila)).toEqual([
      "Ana Beatriz Lima",
      "Luana Ferreira",
    ]);
    expect(marcadasDe(lote(semCamila, { tipo: "desmarcar_todas" }))).toEqual(
      []
    );
  });
});

describe("o Liberar", () => {
  test("pede pessoa marcada e curso escolhido, nessa ordem de aviso", () => {
    expect(prontoParaLiberar(LOTE_VAZIO)).toEqual({ tipo: "falta_marcar" });
    const marcou = rodar({ pessoa: ANA, tipo: "marcar" });
    expect(prontoParaLiberar(marcou)).toEqual({ tipo: "falta_curso" });
    const escolheu = lote(marcou, { curso: COMERCIAL, tipo: "escolher" });
    expect(prontoParaLiberar(escolheu)).toEqual({
      curso: COMERCIAL,
      pessoas: [ANA],
      tipo: "pronto",
    });
  });

  test("passa de 50 marcadas e diz quantas sobram", () => {
    const marcar = Array.from(
      { length: 53 },
      (_, i): EventoDoLote => ({
        pessoa: pessoa(`user_p${i}`, `Pessoa ${i}`),
        tipo: "marcar",
      })
    );
    const e = rodar(...marcar, { curso: COMERCIAL, tipo: "escolher" });
    expect(prontoParaLiberar(e)).toEqual({ sobram: 3, tipo: "passou_do_teto" });
  });

  test("diz para quantas pessoas libera", () => {
    expect([0, 1, 6].map(rotuloDoLiberar)).toEqual([
      "Liberar",
      "Liberar para 1 pessoa",
      "Liberar para 6 pessoas",
    ]);
  });
});

const RESULTADO: ResultadoDoLote = {
  hoje: HOJE,
  pessoas: [
    { tipo: "liberada_agora", userId: ANA.userId },
    {
      liberadaEm: "2025-12-30" as DiaISO,
      origem: "troca",
      tipo: "ja_tinha",
      userId: CAMILA.userId,
    },
    {
      mensagem: "Não deu para liberar agora. Nada mudou para esta pessoa.",
      tipo: "nao_liberou",
      userId: LUANA.userId,
    },
  ],
};

const liberou = rodar(
  { pessoa: ANA, tipo: "marcar" },
  { pessoa: CAMILA, tipo: "marcar" },
  { pessoa: LUANA, tipo: "marcar" },
  { curso: COMERCIAL, tipo: "escolher" },
  { pessoa: pessoa("user_rui", "Rui Prado"), tipo: "marcar" }
);

describe("o resultado", () => {
  const depois = lote(liberou, {
    curso: COMERCIAL,
    enviadas: [ANA, CAMILA, LUANA],
    resultado: RESULTADO,
    tipo: "liberou",
  });
  const linhas = depois.fase.tipo === "resultado" ? depois.fase.linhas : [];

  test("tira da seleção só quem foi enviado", () => {
    expect(marcadasDe(depois)).toEqual(["Rui Prado"]);
  });

  test("põe quem não liberou primeiro e resume as três situações", () => {
    expect(emOrdemDoResultado(linhas).map((l) => l.pessoa.nome)).toEqual([
      "Luana Ferreira",
      "Ana Beatriz Lima",
      "Camila Rocha",
    ]);
    expect(resumoDoResultado(linhas)).toBe(
      "1 liberada agora, 1 já tinha, 1 não liberou"
    );
  });

  test("diz o e-mail de quem liberou, como quem já tinha chegou lá e o motivo de quem não liberou", () => {
    expect(linhas.map((l) => detalheDoResultado(l, HOJE))).toEqual([
      "user_ana@exemplo.com",
      "Trocou por pontos em 30 de dez. de 2025",
      "Não deu para liberar agora. Nada mudou para esta pessoa.",
    ]);
  });

  test("Tentar de novo troca só a linha de quem foi reenviado", () => {
    const repetiu = lote(depois, {
      resultado: {
        hoje: HOJE,
        pessoas: [{ tipo: "liberada_agora", userId: LUANA.userId }],
      },
      tipo: "repetiu",
    });
    const novas = repetiu.fase.tipo === "resultado" ? repetiu.fase.linhas : [];
    expect(resumoDoResultado(novas)).toBe("2 liberadas agora, 1 já tinha");
  });

  test("Nova liberação volta ao formulário sem curso e mantém as marcadas", () => {
    const nova = lote(depois, { tipo: "nova_liberacao" });
    expect(nova.fase).toEqual({ curso: null, tipo: "marcando" });
    expect(marcadasDe(nova)).toEqual(["Rui Prado"]);
  });

  test("no plural", () => {
    const tres = RESULTADO.pessoas.map((p) => ({
      liberacao: {
        ...p,
        liberadaEm: HOJE,
        origem: "admin" as const,
        tipo: "ja_tinha" as const,
      },
      pessoa: ANA,
    }));
    expect(resumoDoResultado(tres)).toBe("3 já tinham");
    expect(detalheDoResultado(tres[0] as (typeof tres)[number], HOJE)).toBe(
      "Liberada em 16 de out."
    );
  });
});

describe("Já tem", () => {
  const comAtivas = (
    ativas: PessoaComSituacao["ativas"]
  ): PessoaComSituacao => ({
    ...ANA,
    ativas,
    situacao: { revogadas: 0, tipo: "sem_liberacao", ultimaRevogacao: null },
  });

  test("só com o curso escolhido, e diz se veio de troca ou do admin", () => {
    const porTroca = comAtivas([{ cursoId: COMERCIAL.id, origem: "troca" }]);
    expect(jaTem(porTroca, null)).toBeNull();
    expect(jaTem(porTroca, COMERCIAL)).toBe(
      "Já tem Profills School Comercial, por troca"
    );
    expect(
      jaTem(comAtivas([{ cursoId: COMERCIAL.id, origem: "admin" }]), COMERCIAL)
    ).toBe("Já tem Profills School Comercial, liberado pelo admin");
    expect(jaTem(comAtivas([]), COMERCIAL)).toBeNull();
  });

  test("o curso aberto ao perfil ainda se libera à pessoa: a caixa fica", () => {
    expect(
      jaTem(comAtivas([{ cursoId: COMERCIAL.id, origem: "perfil" }]), COMERCIAL)
    ).toBeNull();
  });
});
