import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const RAIZ = join(import.meta.dir, "../../..");

const PASTAS = [
  "apps/web/src",
  "packages/api/src",
  "packages/db/src",
  "packages/ui/src",
];

const ESTE_TESTE = "packages/db/src/marcas-nascem-no-lugar.test.ts";

const ONDE_O_PREDICADO_NASCE = new Set([
  "packages/db/src/marcas.ts",
  "packages/api/src/sessao.ts",
]);

const ONDE_A_COLUNA_NASCE = "packages/db/src/schema/";

const MARCAS = [
  ...readFileSync(join(import.meta.dir, "marcas.ts"), "utf8").matchAll(
    /^export type (\w+) = Marca</gmu
  ),
].flatMap(([, nome]) => (nome ? [nome] : []));

const PREDICADO_DE_MARCA = new RegExp(`\\bis\\s+(${MARCAS.join("|")})\\b`, "u");

const COLUNA_TIPADA = /\.\$type<[A-Z]/u;

const arquivosDoCodigo = () =>
  PASTAS.flatMap((pasta) =>
    readdirSync(join(RAIZ, pasta), { recursive: true, withFileTypes: true })
      .filter(
        (d) =>
          d.isFile() &&
          /\.(ts|tsx)$/u.test(d.name) &&
          !d.parentPath.includes("node_modules")
      )
      .map((d) => relative(RAIZ, join(d.parentPath, d.name)))
  ).filter((arquivo) => arquivo !== ESTE_TESTE);

const linhasQueCasam = (arquivo: string, padrao: RegExp) =>
  readFileSync(join(RAIZ, arquivo), "utf8")
    .split("\n")
    .flatMap((linha, i) => (padrao.test(linha) ? [`${arquivo}:${i + 1}`] : []));

describe("a marca nasce no lugar dela", () => {
  test("a lista de marcas sai de marcas.ts", () => {
    expect(MARCAS).toContain("CursoId");
    expect(MARCAS).toContain("Email");
  });

  test("predicado de marca só em packages/db/src/marcas.ts e em sessao.ts", () => {
    const fora = arquivosDoCodigo()
      .filter((arquivo) => !ONDE_O_PREDICADO_NASCE.has(arquivo))
      .flatMap((arquivo) => linhasQueCasam(arquivo, PREDICADO_DE_MARCA));

    expect(fora).toEqual([]);
  });

  test(".$type< só no schema do Drizzle", () => {
    const fora = arquivosDoCodigo()
      .filter((arquivo) => !arquivo.startsWith(ONDE_A_COLUNA_NASCE))
      .flatMap((arquivo) => linhasQueCasam(arquivo, COLUNA_TIPADA));

    expect(fora).toEqual([]);
  });
});
