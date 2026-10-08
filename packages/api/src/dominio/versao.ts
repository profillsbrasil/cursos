import { createHash } from "node:crypto";

import type { Versao } from "./tipos";

/**
 * A versão de um documento do admin é derivada do conteúdo, não guardada: nenhuma
 * coluna atualizado_em, nenhum trigger. JSON com chaves em ordem alfabética em todo
 * nível (arrays mantêm a ordem), depois sha256. Só o servidor calcula: o editor
 * devolve a string que recebeu.
 */
export function versaoDe(conteudo: unknown): Versao {
  return createHash("sha256")
    .update(jsonCanonico(conteudo))
    .digest("base64url") as Versao;
}

function jsonCanonico(valor: unknown): string {
  if (Array.isArray(valor)) {
    return `[${valor.map((v) => (v === undefined ? "null" : jsonCanonico(v))).join(",")}]`;
  }
  if (valor !== null && typeof valor === "object") {
    const objeto = valor as Record<string, unknown>;
    const pares = Object.keys(objeto)
      .sort()
      .filter((k) => objeto[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${jsonCanonico(objeto[k])}`);
    return `{${pares.join(",")}}`;
  }
  return JSON.stringify(valor);
}
