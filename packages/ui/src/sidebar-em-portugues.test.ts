import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const fonte = readFileSync(
  new URL("components/sidebar.tsx", import.meta.url),
  "utf8"
);

const textoEmUmaLinha = fonte.replace(/\s+/g, " ");

const titulo = /<SheetTitle>\s*([^<]*?)\s*<\/SheetTitle>/.exec(
  textoEmUmaLinha
)?.[1];

const descricao = /<SheetDescription>\s*([^<]*?)\s*<\/SheetDescription>/.exec(
  textoEmUmaLinha
)?.[1];

describe("sheet da sidebar no celular", () => {
  test("título em português", () => {
    expect(titulo).toBe("Navegação");
  });

  test("descrição em português", () => {
    expect(descricao).toBe("Menu com as telas da plataforma.");
  });

  test("nenhum texto em inglês do shadcn", () => {
    expect(titulo).not.toBe("Sidebar");
    expect(textoEmUmaLinha).not.toContain("Displays the mobile sidebar");
  });
});
