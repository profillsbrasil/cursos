import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { Glob } from "bun";

const SRC = join(import.meta.dir, "..");
const API = join(SRC, "../../../packages/api/src");
const IMPORTACAO =
  /^(?:import|export)\s+(?!type\b)([^;]*?)\s+from\s+"([^"]+)"/gm;
const SO_TIPOS = /^\{([^}]*)\}$/;

function resolver(de: string, especificador: string): string | null {
  let base: string | null = null;
  if (especificador.startsWith(".")) {
    base = resolve(dirname(de), especificador);
  } else if (especificador.startsWith("@/")) {
    base = join(SRC, especificador.slice(2));
  } else if (especificador.startsWith("@cursos/api/")) {
    base = join(API, especificador.slice("@cursos/api/".length));
  }
  if (base === null) {
    return null;
  }
  const achado = [".ts", ".tsx", "/index.ts", "/index.tsx"]
    .map((fim) => base + fim)
    .find((caminho) => existsSync(caminho));
  return achado ?? null;
}

const soTipos = (clausula: string) => {
  const nomes = SO_TIPOS.exec(clausula.trim())?.[1];
  return (
    nomes
      ?.split(",")
      .map((nome) => nome.trim())
      .filter(Boolean)
      .every((nome) => nome.startsWith("type ")) ?? false
  );
};

function caminhoAteOZod(arquivo: string, visto: Set<string>): string[] | null {
  if (visto.has(arquivo)) {
    return null;
  }
  visto.add(arquivo);
  for (const [, clausula = "", origem = ""] of readFileSync(
    arquivo,
    "utf8"
  ).matchAll(IMPORTACAO)) {
    if (soTipos(clausula)) {
      continue;
    }
    if (origem === "zod" || origem.startsWith("zod/")) {
      return [arquivo];
    }
    const proximo = resolver(arquivo, origem);
    const resto = proximo ? caminhoAteOZod(proximo, visto) : null;
    if (resto) {
      return [arquivo, ...resto];
    }
  }
  return null;
}

function grafo(arquivo: string, visto = new Set<string>()): Set<string> {
  if (visto.has(arquivo)) {
    return visto;
  }
  visto.add(arquivo);
  for (const [, clausula = "", origem = ""] of readFileSync(
    arquivo,
    "utf8"
  ).matchAll(IMPORTACAO)) {
    const proximo = soTipos(clausula) ? null : resolver(arquivo, origem);
    if (proximo) {
      grafo(proximo, visto);
    }
  }
  return visto;
}

/**
 * O Zod pesa cerca de 90 KB em gzip no navegador. Só o editor do curso valida
 * no cliente, com os schemas de edicao-do-curso; o que ele importa já viaja com
 * o Zod. Qualquer outra tela, do aluno ou do admin, fica sem ele.
 */
describe("só o editor do curso carrega o Zod no cliente", () => {
  test("nenhum módulo use client fora do editor chega ao zod", () => {
    const doEditor = grafo(join(SRC, "components/admin/editor-do-curso.tsx"));
    const fora = [...new Glob("**/*.{ts,tsx}").scanSync(SRC)]
      .map((arquivo) => join(SRC, arquivo))
      .filter((arquivo) => !doEditor.has(arquivo))
      .filter((arquivo) =>
        readFileSync(arquivo, "utf8").startsWith('"use client"')
      )
      .map((arquivo) => caminhoAteOZod(arquivo, new Set()))
      .filter((caminho) => caminho !== null)
      .map((caminho) =>
        caminho.map((arquivo) => relative(SRC, arquivo)).join(" > ")
      );
    expect(fora).toEqual([]);
  });
});
