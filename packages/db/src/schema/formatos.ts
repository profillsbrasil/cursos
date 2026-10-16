// Sem import: o browser lê estas listas sem levar drizzle-orm/pg-core para o bundle.
// schema/comum.ts monta os pgEnum a partir delas.

export const STATUS_DO_CURSO = ["em_producao", "publicado"] as const;

/** `troca` é a única que não se revoga. */
export const ORIGEM_DA_LIBERACAO = ["admin", "troca"] as const;

export const SLUG = "^[a-z0-9]+(-[a-z0-9]+)*$";

/** O mesmo formato do ramo youtube do check aula_video_formato. */
export const ID_DO_YOUTUBE = "^[A-Za-z0-9_-]{11}$";

/** Os símbolos do código do certificado: sem 0, O, 1, I e L, que se confundem. */
export const ALFABETO_DO_CODIGO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** "7K3M-Q9TD": dois blocos de 4 do alfabeto. O seed e o servidor geram neste formato. */
export const CODIGO_DO_CERTIFICADO = `^[${ALFABETO_DO_CODIGO}]{4}-[${ALFABETO_DO_CODIGO}]{4}$`;
