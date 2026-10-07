// Contraste WCAG 2.1 dos pares de tokens que a tela usa (PRODUCT.md, Accessibility).
// Lê o :root do globals.css: um token trocado para pior derruba o teste.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");
const raiz = css.slice(
  css.indexOf(":root {"),
  css.indexOf("}", css.indexOf(":root {"))
);
const TOKEN = /--([a-z0-9-]+):\s*(#[0-9a-f]{6});/gi;
const tokens = new Map(
  [...raiz.matchAll(TOKEN)].map((m) => [m[1] ?? "", (m[2] ?? "").toLowerCase()])
);

type Rgb = [number, number, number];

function rgb(token: string): Rgb {
  const hex = tokens.get(token);
  if (!hex) {
    throw new Error(`token --${token} ausente do :root`);
  }
  return [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16)) as Rgb;
}

/** Cor `frente` com opacidade `alfa` composta sobre `fundo`. */
const mistura = (frente: Rgb, alfa: number, fundo: Rgb): Rgb =>
  frente.map((c, i) =>
    Math.round(c * alfa + (fundo[i] ?? 0) * (1 - alfa))
  ) as Rgb;

function luminancia([r, g, b]: Rgb) {
  const canal = (c: number) => {
    const s = c / 255;
    return s <= 0.040_45 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

function razao(a: Rgb, b: Rgb) {
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return ((claro ?? 0) + 0.05) / ((escuro ?? 0) + 0.05);
}

const TEXTO = 4.5;
const PECA = 3;

// [frente, fundo, mínimo]: fundo pode ser um token ou uma cor composta.
const PARES: [string, string | Rgb, number][] = [
  ["foreground", "background", TEXTO],
  ["foreground", "card", TEXTO],
  ["foreground", "popover", TEXTO],
  ["foreground", "sidebar", TEXTO],
  ["muted-foreground", "background", TEXTO],
  ["muted-foreground", "card", TEXTO],
  ["muted-foreground", "muted", TEXTO],
  ["muted-foreground", "sidebar", TEXTO],
  ["muted-foreground", "sidebar-accent", TEXTO],
  ["titulo", "sidebar-accent", TEXTO],
  ["primary-foreground", "primary", TEXTO],
  ["sidebar-primary-foreground", "sidebar-primary", TEXTO],
  ["sobre-cor", "sol", TEXTO],
  ["sobre-cor", "ceu", TEXTO],
  ["sobre-cor", "canela", TEXTO],
  ["sol", "card", TEXTO],
  ["sol", mistura(rgb("sol"), 0.14, rgb("card")), TEXTO],
  ["ceu", "card", TEXTO],
  ["ceu", "background", TEXTO],
  ["canela", "card", TEXTO],
  ["destructive", "card", TEXTO],
  ["sol", "trilho", PECA],
  ["muted-foreground", "card", PECA],
  ["input", "background", PECA],
  ["ring", "background", PECA],
  ["ring", "card", PECA],
];

describe("contraste dos tokens", () => {
  for (const [frente, fundo, minimo] of PARES) {
    const nomeFundo =
      typeof fundo === "string" ? fundo : "sol a 14% sobre card";
    test(`${frente} sobre ${nomeFundo} >= ${minimo}:1`, () => {
      const cor = typeof fundo === "string" ? rgb(fundo) : fundo;
      expect(razao(rgb(frente), cor)).toBeGreaterThanOrEqual(minimo);
    });
  }
});
