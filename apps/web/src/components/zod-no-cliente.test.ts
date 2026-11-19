import { describe, expect, test } from "bun:test";
import { join, relative } from "node:path";

import {
  grafo,
  importacoesDe,
  modulosDoCliente,
  SRC,
} from "./grafo-do-cliente";

function caminhoAteOZod(arquivo: string, visto: Set<string>): string[] | null {
  if (visto.has(arquivo)) {
    return null;
  }

  visto.add(arquivo);

  for (const { origem, proximo } of importacoesDe(arquivo)) {
    if (origem === "zod" || origem.startsWith("zod/")) {
      return [arquivo];
    }

    const resto = proximo ? caminhoAteOZod(proximo, visto) : null;

    if (resto) {
      return [arquivo, ...resto];
    }
  }

  return null;
}

describe("só o editor do curso carrega o Zod no cliente", () => {
  test("nenhum módulo use client fora do editor chega ao zod", () => {
    const doEditor = grafo(join(SRC, "components/admin/editor-do-curso.tsx"));

    const fora = modulosDoCliente().flatMap((arquivo) => {
      const caminho = doEditor.has(arquivo)
        ? null
        : caminhoAteOZod(arquivo, new Set());

      return caminho
        ? [caminho.map((passo) => relative(SRC, passo)).join(" > ")]
        : [];
    });

    expect(fora).toEqual([]);
  });
});
