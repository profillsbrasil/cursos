import type { Versao } from "./tipos";

/**
 * A versão de um documento do admin é derivada do conteúdo, não guardada: nenhuma
 * coluna atualizado_em, nenhum trigger. JSON com chaves em ordem alfabética em todo
 * nível (arrays mantêm a ordem, que é conteúdo), depois cyrb53, sem node:crypto
 * porque o editor roda no browser. Uma colisão de 53 bits só deixaria um salvamento
 * concorrente passar sem CONFLICT; o risco é aceito.
 */
export function versaoDe<D extends { versao: Versao | null }>(
  documento: D
): Versao {
  const { versao: _, ...conteudo } = documento;
  return cyrb53(jsonCanonico(conteudo)).toString(36) as Versao;
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

// cyrb53 de bryc, domínio público. O hash é aritmética de 32 bits, por isso os
// operadores de bit.
// biome-ignore-start lint/suspicious/noBitwiseOperators: cyrb53
function cyrb53(texto: string): number {
  let h1 = 0xde_ad_be_ef;
  let h2 = 0x41_c6_ce_57;
  for (let i = 0; i < texto.length; i += 1) {
    const c = texto.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2_654_435_761);
    h2 = Math.imul(h2 ^ c, 1_597_334_677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2_246_822_507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3_266_489_909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2_246_822_507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3_266_489_909);
  return 4_294_967_296 * (2_097_151 & h2) + (h1 >>> 0);
}
// biome-ignore-end lint/suspicious/noBitwiseOperators: cyrb53
