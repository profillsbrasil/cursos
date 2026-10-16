import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { AREA, CAMPO } from "./campos";

const SRC = join(import.meta.dir, "..", "..");

function arquivos(pasta: string): string[] {
  return readdirSync(pasta, { recursive: true, withFileTypes: true })
    .filter(
      (e) =>
        e.isFile() &&
        e.name.endsWith(".tsx") &&
        !e.name.includes(".test.") &&
        !e.parentPath.includes("node_modules")
    )
    .map((e) => join(e.parentPath, e.name));
}

const ALTURA = /(^|\s)([\w-]+:)*h-(\d|\[)/;

/** As classes que um uso acrescenta ao campo: cn(CAMPO|AREA, "...") e o className dos campos do editor. */
function classesDoUso(codigo: string): string[] {
  const achadas: string[] = [];
  for (const m of codigo.matchAll(/cn\(\s*(?:CAMPO|AREA),\s*"([^"]*)"/g)) {
    achadas.push(m[1] ?? "");
  }
  for (const m of codigo.matchAll(
    /<(?:CampoDeTexto|CampoLido)\b[^>]*?\sclassName="([^"]*)"/g
  )) {
    achadas.push(m[1] ?? "");
  }
  return achadas;
}

describe("o campo e a área de texto do kit C", () => {
  test("o campo é a pílula de 44 px, e a área tem raio de 20 px", () => {
    expect(CAMPO).toContain("h-11");
    expect(CAMPO).toContain("rounded-full");
    expect(AREA).toContain("rounded-[20px]");
  });

  test("nenhum uso acrescenta altura ao campo: ela vem da constante", () => {
    const soltas = arquivos(SRC).flatMap((arquivo) =>
      classesDoUso(readFileSync(arquivo, "utf8"))
        .filter((classes) => ALTURA.test(classes))
        .map((classes) => `${relative(SRC, arquivo)}: "${classes}"`)
    );
    expect(soltas).toEqual([]);
  });
});
