// O código do certificado: 8 símbolos de um alfabeto sem 0, O, 1, I e L, gravado
// como XXXX-XXXX. Roda no servidor e no browser (a conferência pública digita o
// código), então o aleatório vem do Web Crypto, não de node:crypto.

export const ALFABETO_DO_CODIGO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

const SIMBOLOS = 8;
const METADE = SIMBOLOS / 2;

/** "7K3M-Q9TD": dois blocos de 4 do alfabeto. */
export const FORMATO_DO_CODIGO = new RegExp(
  `^[${ALFABETO_DO_CODIGO}]{${METADE}}-[${ALFABETO_DO_CODIGO}]{${METADE}}$`
);

/**
 * O código a partir de 8 índices no alfabeto. Índice fora do alfabeto é defeito de
 * quem sorteou, não entrada da pessoa: lança.
 */
export function codigoDosIndices(indices: ArrayLike<number>): string {
  if (indices.length !== SIMBOLOS) {
    throw new Error(
      `O código tem ${SIMBOLOS} símbolos, não ${indices.length}.`
    );
  }
  const simbolos = Array.from(indices, (i) => {
    const s = ALFABETO_DO_CODIGO[i];
    if (s === undefined) {
      throw new Error(`Índice ${i} fora do alfabeto do código.`);
    }
    return s;
  });
  return `${simbolos.slice(0, METADE).join("")}-${simbolos.slice(METADE).join("")}`;
}

// 248 é o maior múltiplo de 31 abaixo de 256: byte acima dele é sorteado de novo,
// para nenhum símbolo sair mais vezes que os outros.
const TETO_SEM_VIES =
  Math.floor(256 / ALFABETO_DO_CODIGO.length) * ALFABETO_DO_CODIGO.length;

/** Um código novo, sorteado. Quem grava trata a colisão com o unique tentando de novo. */
export function gerarCodigo(): string {
  const indices: number[] = [];
  while (indices.length < SIMBOLOS) {
    const bytes = crypto.getRandomValues(new Uint8Array(SIMBOLOS));
    for (const b of bytes) {
      if (b < TETO_SEM_VIES && indices.length < SIMBOLOS) {
        indices.push(b % ALFABETO_DO_CODIGO.length);
      }
    }
  }
  return codigoDosIndices(indices);
}

const FORA_DO_ALFABETO = /[^A-Z0-9]/g;

/**
 * O que a pessoa digitou, no formato gravado: ignora caixa, espaços e o hífen.
 * null quando não sobra um código possível (0, O, 1, I e L nunca aparecem num
 * código). Quem confere busca pelo texto devolvido.
 */
export function normalizarCodigo(texto: string): string | null {
  const limpo = texto.toUpperCase().replaceAll(FORA_DO_ALFABETO, "");
  if (limpo.length !== SIMBOLOS) {
    return null;
  }
  const codigo = `${limpo.slice(0, METADE)}-${limpo.slice(METADE)}`;
  return FORMATO_DO_CODIGO.test(codigo) ? codigo : null;
}
