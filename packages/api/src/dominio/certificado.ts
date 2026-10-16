// O código do certificado. Roda também no browser (a tela de conferência digita
// o código), então o aleatório vem do Web Crypto, não de node:crypto.

import {
  ALFABETO_DO_CODIGO,
  CODIGO_DO_CERTIFICADO,
  codigoDosIndices,
} from "@cursos/db/schema/formatos";

const SIMBOLOS = 8;

export const FORMATO_DO_CODIGO = new RegExp(CODIGO_DO_CERTIFICADO);

// O maior múltiplo do alfabeto abaixo de 256: byte acima dele é sorteado de novo,
// para nenhum símbolo sair mais vezes que os outros.
const TETO_SEM_VIES =
  Math.floor(256 / ALFABETO_DO_CODIGO.length) * ALFABETO_DO_CODIGO.length;

/** Um código novo, sorteado. A colisão com o unique é de quem grava. */
export function gerarCodigo(): CodigoDoCertificado {
  const indices: number[] = [];
  while (indices.length < SIMBOLOS) {
    const bytes = crypto.getRandomValues(new Uint8Array(SIMBOLOS));
    for (const b of bytes) {
      if (b < TETO_SEM_VIES && indices.length < SIMBOLOS) {
        indices.push(b % ALFABETO_DO_CODIGO.length);
      }
    }
  }
  return codigoDosIndices(indices) as CodigoDoCertificado;
}

declare const marca: unique symbol;

/** O código no formato do banco: `XXXX-XXXX`, em maiúsculas. */
export type CodigoDoCertificado = string & {
  readonly [marca]: "CodigoDoCertificado";
};

const SEPARADORES = /[\s\-\u2010-\u2015]/g;

/** O que a pessoa digitou, no formato do banco: sem caixa, espaços nem hífen. null quando não é um código. */
export function codigoDigitado(texto: string): CodigoDoCertificado | null {
  const limpo = texto.toUpperCase().replaceAll(SEPARADORES, "");
  const codigo = `${limpo.slice(0, SIMBOLOS / 2)}-${limpo.slice(SIMBOLOS / 2)}`;
  return FORMATO_DO_CODIGO.test(codigo)
    ? (codigo as CodigoDoCertificado)
    : null;
}
