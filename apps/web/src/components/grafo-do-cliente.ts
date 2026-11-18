import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { Glob } from "bun";

export const SRC = join(import.meta.dir, "..");
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

export interface Importacao {
  readonly origem: string;
  /** O arquivo do app ou do `@cursos/api`; null para pacote de fora. */
  readonly proximo: string | null;
}

/** Os imports de `arquivo` que levam código ao bundle, sem os só de tipo. */
export function importacoesDe(arquivo: string): Importacao[] {
  const saida: Importacao[] = [];

  for (const [, clausula = "", origem = ""] of readFileSync(
    arquivo,
    "utf8"
  ).matchAll(IMPORTACAO)) {
    if (!soTipos(clausula)) {
      saida.push({ origem, proximo: resolver(arquivo, origem) });
    }
  }

  return saida;
}

export function grafo(arquivo: string, visto = new Set<string>()): Set<string> {
  if (visto.has(arquivo)) {
    return visto;
  }

  visto.add(arquivo);

  for (const { proximo } of importacoesDe(arquivo)) {
    if (proximo) {
      grafo(proximo, visto);
    }
  }

  return visto;
}

/** Os módulos de `apps/web/src` que abrem com "use client". */
export function modulosDoCliente(): string[] {
  const saida: string[] = [];

  for (const arquivo of new Glob("**/*.{ts,tsx}").scanSync(SRC)) {
    const caminho = join(SRC, arquivo);

    if (readFileSync(caminho, "utf8").startsWith('"use client"')) {
      saida.push(caminho);
    }
  }

  return saida;
}
