import { describe, expect, test } from "bun:test";

import {
  type LinhaDoComunicadoDoAluno,
  montarComunicados,
  montarComunicadosDoAluno,
} from "./comunicado";
import type { ComunicadoId, DiaISO } from "./tipos";

const linha = (id: string, publicadoPor: string) => ({
  curso: null,
  id: id as ComunicadoId,
  publicadoEm: new Date("2026-10-01T12:00:00Z"),
  publicadoPor,
  texto: "Texto",
  titulo: `Comunicado ${id}`,
});

describe("autor do comunicado", () => {
  const { comunicados } = montarComunicados(
    {
      comunicados: [
        linha("a", "user_dona"),
        linha("b", "user_seed"),
        linha("c", "user_so_telefone"),
      ],
      cursos: [],
    },
    [
      { email: null, foto: null, nome: "Dona do admin", userId: "user_dona" },
      // Sem nome, usuário nem e-mail, o Clerk devolve o userId no lugar do nome.
      {
        email: null,
        foto: null,
        nome: "user_so_telefone",
        userId: "user_so_telefone",
      },
    ]
  );

  test("quem o Clerk conhece aparece pelo nome; quem ele não conhece ou conhece sem nome fica sem autor, nunca com o userId", () => {
    expect(comunicados.map((c) => c.publicadoPor)).toEqual([
      "Dona do admin",
      null,
      null,
    ]);
  });
});

const COMERCIAL = {
  capaAlt: "Capa do Comercial",
  capaAltura: 604,
  capaLargura: 900,
  capaUrl: "/capas/comercial.jpg",
  slug: "comercial",
  titulo: "Profills School Comercial",
};

const doAluno = (
  id: string,
  publicadoEm: string,
  curso: LinhaDoComunicadoDoAluno["curso"] = null
): LinhaDoComunicadoDoAluno => ({
  curso,
  id: id as ComunicadoId,
  publicadoEm: new Date(publicadoEm),
  publicadoPor: "user_marina",
  texto: "Texto",
  titulo: `Comunicado ${id}`,
});

const MARINA = {
  email: null,
  foto: null,
  nome: "Marina Duarte",
  userId: "user_marina",
};

describe("os comunicados do aluno", () => {
  test("sem comunicado, a lista é vazia", () => {
    expect(montarComunicadosDoAluno([], [])).toEqual({ tipo: "vazio" });
  });

  test("o mais novo é o destaque, com a capa e o link do curso, e os outros vão por mês", () => {
    const r = montarComunicadosDoAluno(
      [
        doAluno("c1", "2026-10-14T13:00:00Z", COMERCIAL),
        doAluno("c2", "2026-10-09T13:00:00Z"),
        doAluno("c3", "2026-10-01T13:00:00Z", COMERCIAL),
        doAluno("c4", "2026-09-22T13:00:00Z"),
      ],
      [MARINA]
    );
    if (r.tipo !== "com_comunicados") {
      throw new Error("esperava comunicados");
    }
    expect(r.destaque).toEqual({
      alvo: {
        capa: {
          alt: "Capa do Comercial",
          altura: 604,
          largura: 900,
          url: "/capas/comercial.jpg",
        },
        href: "/cursos/comercial",
        tipo: "curso",
        titulo: "Profills School Comercial",
      },
      dia: "2026-10-14" as DiaISO,
      id: "c1" as ComunicadoId,
      publicadoEm: "2026-10-14T13:00:00.000Z",
      publicadoPor: "Marina Duarte",
      texto: "Texto",
      titulo: "Comunicado c1",
    });
    expect(
      r.anteriores.map((m) => [m.mes, m.comunicados.map((c) => String(c.id))])
    ).toEqual([
      ["2026-10", ["c2", "c3"]],
      ["2026-09", ["c4"]],
    ]);
    expect(r.anteriores[0]?.comunicados[0]?.alvo).toEqual({ tipo: "geral" });
  });

  test("o dia e o mês são os de São Paulo: 1º de outubro às 1h UTC ainda é setembro", () => {
    const r = montarComunicadosDoAluno(
      [
        doAluno("novo", "2026-10-05T12:00:00Z"),
        doAluno("virada", "2026-10-01T01:00:00Z"),
      ],
      []
    );
    if (r.tipo !== "com_comunicados") {
      throw new Error("esperava comunicados");
    }
    expect(r.anteriores).toMatchObject([
      { comunicados: [{ dia: "2026-09-30", id: "virada" }], mes: "2026-09" },
    ]);
    expect(r.destaque.publicadoPor).toBeNull();
  });

  test("um comunicado só fica sem anteriores", () => {
    const r = montarComunicadosDoAluno(
      [doAluno("so", "2026-10-14T13:00:00Z")],
      [MARINA]
    );
    expect(r).toMatchObject({ anteriores: [], tipo: "com_comunicados" });
  });
});
