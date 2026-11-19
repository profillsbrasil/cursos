import { createHash } from "node:crypto";

import { versao } from "./marcas";
import type { Versao } from "./tipos";

/**
 * A versão de um documento do admin é derivada do conteúdo, não guardada: nenhuma
 * coluna atualizado_em, nenhum trigger. JSON com chaves em ordem alfabética em todo
 * nível (arrays mantêm a ordem), depois sha256. Só o servidor calcula: o editor
 * devolve a string que recebeu.
 */
export function versaoDe(conteudo: unknown): Versao {
  return versao(
    createHash("sha256").update(jsonCanonico(conteudo)).digest("base64url")
  );
}

const ehObjeto = (valor: unknown): valor is Record<string, unknown> =>
  valor !== null && typeof valor === "object";

function jsonCanonico(valor: unknown): string {
  if (Array.isArray(valor)) {
    return `[${valor.map((v) => (v === undefined ? "null" : jsonCanonico(v))).join(",")}]`;
  }

  if (ehObjeto(valor)) {
    const pares = Object.keys(valor)
      .sort()
      .filter((k) => valor[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${jsonCanonico(valor[k])}`);

    return `{${pares.join(",")}}`;
  }

  return JSON.stringify(valor);
}
