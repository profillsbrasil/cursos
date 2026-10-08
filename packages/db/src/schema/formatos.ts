// Sem import: o browser lê estas listas sem levar drizzle-orm/pg-core para o bundle.
// schema/comum.ts monta os pgEnum a partir delas.

export const STATUS_DO_CURSO = ["em_producao", "publicado"] as const;

/** `troca` é a única que não se revoga. */
export const ORIGEM_DA_LIBERACAO = ["admin", "troca"] as const;

export const SLUG = "^[a-z0-9]+(-[a-z0-9]+)*$";

/** O mesmo formato do ramo youtube do check aula_video_formato. */
export const ID_DO_YOUTUBE = "^[A-Za-z0-9_-]{11}$";
