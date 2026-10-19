import { describe, expect, test } from "bun:test";

import { comandoDaTecla } from "./teclado";

const tecla = (
  key: string,
  mod: Partial<Record<"altKey" | "ctrlKey" | "metaKey", boolean>> = {}
) =>
  comandoDaTecla({
    altKey: false,
    ctrlKey: false,
    key,
    metaKey: false,
    ...mod,
  });

describe("comandoDaTecla", () => {
  test("o mapa do protótipo", () => {
    expect(tecla(" ")).toEqual({ tipo: "alternar" });
    expect(tecla("k")).toEqual({ tipo: "alternar" });
    expect(tecla("K")).toEqual({ tipo: "alternar" });
    expect(tecla("ArrowLeft")).toEqual({ seg: -5, tipo: "saltar" });
    expect(tecla("ArrowRight")).toEqual({ seg: 5, tipo: "saltar" });
    expect(tecla("j")).toEqual({ seg: -10, tipo: "saltar" });
    expect(tecla("l")).toEqual({ seg: 10, tipo: "saltar" });
    expect(tecla("ArrowUp")).toEqual({ delta: 10, tipo: "volume" });
    expect(tecla("ArrowDown")).toEqual({ delta: -10, tipo: "volume" });
    expect(tecla("m")).toEqual({ tipo: "mudo" });
    expect(tecla("f")).toEqual({ tipo: "tela_cheia" });
  });

  test("c liga e desliga a legenda, e ? abre a lista de atalhos", () => {
    expect(tecla("c")).toEqual({ tipo: "legenda" });
    expect(tecla("C")).toEqual({ tipo: "legenda" });
    expect(tecla("?")).toEqual({ tipo: "atalhos" });
  });

  test("tecla desconhecida não vira comando", () => {
    expect(tecla("x")).toBeNull();
  });

  test("com Ctrl, Alt ou Meta a tecla é do browser", () => {
    expect(tecla("k", { ctrlKey: true })).toBeNull();
    expect(tecla("f", { metaKey: true })).toBeNull();
    expect(tecla("ArrowLeft", { altKey: true })).toBeNull();
  });
});
