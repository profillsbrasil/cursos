// O `shadcn add sidebar --overwrite` regenera src/components/sidebar.tsx e devolve o
// título e a descrição do sheet do celular para o inglês. O título não tem prop, então
// a tradução mora no arquivo gerado; este teste acusa quando ela se perde.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const fonte = readFileSync(
  new URL("./components/sidebar.tsx", import.meta.url),
  "utf8"
);
// Junta espaços e quebras de linha para o texto do JSX caber numa busca só.
const texto = fonte.replace(/\s+/g, " ");
const titulo = /<SheetTitle>\s*([^<]*?)\s*<\/SheetTitle>/.exec(texto)?.[1];
const descricao = /<SheetDescription>\s*([^<]*?)\s*<\/SheetDescription>/.exec(
  texto
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
    expect(texto).not.toContain("Displays the mobile sidebar");
  });
});
