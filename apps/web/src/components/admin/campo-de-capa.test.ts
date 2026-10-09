import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { capaNoCampo, type EstadoDaCapa } from "./campo-de-capa";

describe("capaNoCampo: quando o campo da capa zera", () => {
  const foto = new File(["a"], "capa.jpg", { type: "image/jpeg" });
  const outra = new File(["b"], "outra.png", { type: "image/png" });
  const com = (arquivo: File): EstadoDaCapa => ({
    erro: null,
    escolhida: {
      arquivo,
      medida: { altura: 720, largura: 1280 },
      url: "blob:x",
    },
    geracao: 0,
  });
  const ZERADO: EstadoDaCapa = { erro: null, escolhida: null, geracao: 0 };

  test("o salvar que enviou a capa devolve o arquivo do editor a null, e o campo zera", () => {
    expect(capaNoCampo(com(foto), null, 0)).toEqual(ZERADO);
  });

  test("a capa escolhida durante o salvar fica", () => {
    const comOutra = com(outra);
    expect(capaNoCampo(comOutra, outra, 0)).toBe(comOutra);
  });

  test("a imagem recusada deixa o aviso, porque o editor já não guarda arquivo", () => {
    const recusada: EstadoDaCapa = { ...ZERADO, erro: "Use uma imagem JPG." };
    expect(capaNoCampo(recusada, null, 0)).toBe(recusada);
  });

  test("o recomeço do editor zera o campo, aviso inclusive", () => {
    const recusada: EstadoDaCapa = { ...ZERADO, erro: "Use uma imagem JPG." };
    expect(capaNoCampo(recusada, null, 1)).toEqual({ ...ZERADO, geracao: 1 });
    expect(capaNoCampo(com(foto), null, 1)).toEqual({ ...ZERADO, geracao: 1 });
  });
});

const CAMPO_DE_CAPA = /<CampoDeCapa\b[^>]*>/g;
const KEY = /\bkey=/;

// Remontar o campo tira o foco do texto alternativo, que mora nele.
describe("o editor do curso monta o campo da capa sem key", () => {
  test("editor-do-curso.tsx", () => {
    const editor = readFileSync(
      join(import.meta.dir, "editor-do-curso.tsx"),
      "utf8"
    );
    const campos = [...editor.matchAll(CAMPO_DE_CAPA)];
    expect(campos).toHaveLength(1);
    expect(campos[0]?.[0]).not.toMatch(KEY);
  });
});
