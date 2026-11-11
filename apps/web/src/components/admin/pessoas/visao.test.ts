import { describe, expect, test } from "bun:test";

import { camposDaVisao, hrefDaVisao, visaoDe } from "./visao";

describe("visaoDe", () => {
  test("sem parâmetro, mostra todos", () => {
    expect(visaoDe({})).toEqual({ tipo: "todos" });
  });

  test("perfil conhecido filtra por ele, e o desconhecido vale todos", () => {
    expect(visaoDe({ perfil: "cliente" })).toEqual({
      perfil: "cliente",
      tipo: "perfil",
    });
    expect(visaoDe({ perfil: "gerente" })).toEqual({ tipo: "todos" });
    expect(visaoDe({ perfil: ["cliente", "publico"] })).toEqual({
      tipo: "todos",
    });
  });

  test("ver=convidados vence o perfil, e outro valor de ver não conta", () => {
    expect(visaoDe({ perfil: "cliente", ver: "convidados" })).toEqual({
      tipo: "convidados",
    });
    expect(visaoDe({ perfil: "cliente", ver: "tudo" })).toEqual({
      perfil: "cliente",
      tipo: "perfil",
    });
  });
});

describe("hrefDaVisao", () => {
  test("monta o endereço de cada visão, com a busca quando há", () => {
    expect<string>(hrefDaVisao({ tipo: "todos" }, "")).toBe("/admin/pessoas");
    expect<string>(hrefDaVisao({ tipo: "todos" }, "ana lima")).toBe(
      "/admin/pessoas?q=ana+lima"
    );
    expect<string>(
      hrefDaVisao({ perfil: "funcionario", tipo: "perfil" }, "ana")
    ).toBe("/admin/pessoas?perfil=funcionario&q=ana");
    expect<string>(hrefDaVisao({ tipo: "convidados" }, "")).toBe(
      "/admin/pessoas?ver=convidados"
    );
  });

  test("o endereço de uma visão volta à mesma visão", () => {
    const visoes = [
      { tipo: "todos" },
      { perfil: "publico", tipo: "perfil" },
      { tipo: "convidados" },
    ] as const;
    for (const visao of visoes) {
      const busca = new URL(hrefDaVisao(visao, "x"), "http://app").searchParams;
      expect(visaoDe(Object.fromEntries(busca))).toEqual(visao);
    }
  });
});

describe("camposDaVisao", () => {
  test("a busca leva junto o parâmetro da visão", () => {
    expect(camposDaVisao({ tipo: "todos" })).toBeUndefined();
    expect(camposDaVisao({ perfil: "cliente", tipo: "perfil" })).toEqual({
      perfil: "cliente",
    });
    expect(camposDaVisao({ tipo: "convidados" })).toEqual({
      ver: "convidados",
    });
  });
});
