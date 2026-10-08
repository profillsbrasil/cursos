// Sem import: o browser lê estas listas sem levar drizzle-orm/pg-core para o bundle.
// schema/comum.ts monta os pgEnum a partir delas.

export const STATUS_DO_CURSO = ["em_producao", "publicado"] as const;

/** `troca` é a única que não se revoga. */
export const ORIGEM_DA_LIBERACAO = ["admin", "troca"] as const;
