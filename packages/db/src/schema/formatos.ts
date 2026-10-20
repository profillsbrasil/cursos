// Sem import: o browser lê estas listas sem levar drizzle-orm/pg-core para o bundle.
// schema/comum.ts monta os pgEnum a partir delas.

export const STATUS_DO_CURSO = ["em_producao", "publicado"] as const;

/** `troca` é a única que não se revoga. */
export const ORIGEM_DA_LIBERACAO = ["admin", "troca"] as const;

/**
 * As extensões do material de apoio. O registro com content-type, assinatura e
 * rótulo mora em dominio/material.ts do @cursos/api.
 */
export const TIPO_DO_MATERIAL = [
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "png",
  "jpg",
  "webp",
  "zip",
] as const;

export const SLUG = "^[a-z0-9]+(-[a-z0-9]+)*$";

/** O mesmo formato do ramo youtube do check aula_video_formato. */
export const ID_DO_YOUTUBE = "^[A-Za-z0-9_-]{11}$";

/** Os símbolos do código do certificado: sem 0, O, 1, I e L, que se confundem. */
export const ALFABETO_DO_CODIGO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

const SIMBOLOS_DO_CODIGO = 8;
const METADE_DO_CODIGO = SIMBOLOS_DO_CODIGO / 2;

/** "7K3M-Q9TD": dois blocos de 4 do alfabeto. */
export const CODIGO_DO_CERTIFICADO = `^[${ALFABETO_DO_CODIGO}]{${METADE_DO_CODIGO}}-[${ALFABETO_DO_CODIGO}]{${METADE_DO_CODIGO}}$`;

/** O código a partir de 8 índices no alfabeto. Índice fora dele é defeito de quem sorteou: lança. */
export function codigoDosIndices(indices: ArrayLike<number>): string {
  if (indices.length !== SIMBOLOS_DO_CODIGO) {
    throw new Error(
      `O código tem ${SIMBOLOS_DO_CODIGO} símbolos, não ${indices.length}.`
    );
  }
  const simbolos = Array.from(indices, (i) => {
    const s = ALFABETO_DO_CODIGO[i];
    if (s === undefined) {
      throw new Error(`Índice ${i} fora do alfabeto do código.`);
    }
    return s;
  });
  return `${simbolos.slice(0, METADE_DO_CODIGO).join("")}-${simbolos.slice(METADE_DO_CODIGO).join("")}`;
}
