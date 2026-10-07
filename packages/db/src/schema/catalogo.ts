import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  integer,
  primaryKey,
  smallint,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { cursoStatus, momento, SLUG, tabela } from "./comum";

export const trilha = tabela(
  "trilha",
  {
    criadaEm: momento(),
    descricao: text().notNull(),
    id: uuid().primaryKey().defaultRandom(),
    slug: text().notNull().unique(),
    titulo: text().notNull(),
  },
  (t) => [check("trilha_slug_formato", sql`${t.slug} ~ ${SLUG}`)]
);

export const curso = tabela(
  "curso",
  {
    capaAlt: text().notNull(),
    capaUrl: text().notNull(),
    codigo: text().unique(), // ex.: POP-COM-001
    criadoEm: momento(),
    destaque: text(), // ex.: "Regra 5x4"
    id: uuid().primaryKey().defaultRandom(),
    slug: text().notNull().unique(),
    status: cursoStatus().notNull().default("em_producao"),
    tema: text().notNull(),
    titulo: text().notNull(),
  },
  (t) => [
    check("curso_slug_formato", sql`${t.slug} ~ ${SLUG}`),
    check("curso_capa_alt_preenchido", sql`length(trim(${t.capaAlt})) > 0`),
  ]
);

// Um curso está em no máximo uma trilha: a chave primária é o curso.
export const trilhaCurso = tabela(
  "trilha_curso",
  {
    cursoId: uuid()
      .primaryKey()
      .references(() => curso.id, { onDelete: "restrict" }),
    posicao: smallint().notNull(),
    trilhaId: uuid()
      .notNull()
      .references(() => trilha.id, { onDelete: "cascade" }),
  },
  (t) => [
    unique("trilha_curso_posicao_unica").on(t.trilhaId, t.posicao),
    check("trilha_curso_posicao_positiva", sql`${t.posicao} >= 1`),
  ]
);

export const nivel = tabela(
  "nivel",
  {
    cursoId: uuid()
      .notNull()
      .references(() => curso.id, { onDelete: "cascade" }),
    nome: text().notNull(),
    ordem: smallint().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.cursoId, t.ordem] }),
    check("nivel_ordem_positiva", sql`${t.ordem} >= 1`),
  ]
);

// nivel_ordem nulo não é checado (MATCH SIMPLE). Preenchido, é nível do mesmo curso.
// Uma coluna por módulo: dois níveis sobre o mesmo módulo não têm como existir.
export const modulo = tabela(
  "modulo",
  {
    cursoId: uuid()
      .notNull()
      .references(() => curso.id, { onDelete: "cascade" }),
    id: uuid().primaryKey().defaultRandom(),
    nivelOrdem: smallint(),
    numero: smallint().notNull(),
    titulo: text().notNull(),
  },
  (t) => [
    unique("modulo_numero_unico").on(t.cursoId, t.numero),
    foreignKey({
      columns: [t.cursoId, t.nivelOrdem],
      foreignColumns: [nivel.cursoId, nivel.ordem],
      name: "modulo_nivel_do_mesmo_curso",
    }).onDelete("restrict"),
    check("modulo_numero_nao_negativo", sql`${t.numero} >= 0`),
  ]
);

export const aula = tabela(
  "aula",
  {
    duracaoSeg: integer().notNull(),
    id: uuid().primaryKey().defaultRandom(),
    moduloId: uuid()
      .notNull()
      .references(() => modulo.id, { onDelete: "cascade" }),
    posicao: smallint().notNull(),
    titulo: text().notNull(),
  },
  (t) => [
    unique("aula_posicao_unica").on(t.moduloId, t.posicao),
    check("aula_posicao_positiva", sql`${t.posicao} >= 1`),
    check("aula_duracao_positiva", sql`${t.duracaoSeg} > 0`),
  ]
);
