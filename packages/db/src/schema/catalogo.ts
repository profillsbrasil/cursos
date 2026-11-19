import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  integer,
  primaryKey,
  smallint,
  text,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import type {
  AlternativaId,
  AulaId,
  CategoriaId,
  CursoId,
  MaterialId,
  ModuloId,
  PerguntaId,
  VideoId,
} from "../marcas";
import {
  cursoStatus,
  materialTipo,
  momento,
  tabela,
  videoProvedor,
} from "./comum";
import { SLUG } from "./formatos";

export const categoria = tabela(
  "categoria",
  {
    criadaEm: momento(),
    id: uuid().primaryKey().defaultRandom().$type<CategoriaId>(),
    nome: text().notNull(),
  },
  (t) => [
    unique("categoria_nome_unico").on(t.nome),
    check(
      "categoria_nome_formato",
      sql`${t.nome} = trim(${t.nome}) and char_length(${t.nome}) between 1 and 80`
    ),
  ]
);

export const curso = tabela(
  "curso",
  {
    capaAlt: text().notNull(),
    capaAltura: smallint().notNull(),
    capaLargura: smallint().notNull(),
    capaUrl: text().notNull(),
    categoriaId: uuid()
      .notNull()
      .references(() => categoria.id, { onDelete: "restrict" })
      .$type<CategoriaId>(),
    codigo: text().notNull().unique(),
    criadoEm: momento(),
    descricao: text().notNull().default(""),
    id: uuid().primaryKey().defaultRandom().$type<CursoId>(),
    precoTroca: integer(),
    slug: text().notNull().unique(),
    status: cursoStatus().notNull().default("em_producao"),
    titulo: text().notNull(),
    topicos: text()
      .array()
      .notNull()
      .default(sql`'{}'`),
  },
  (t) => [
    check("curso_slug_formato", sql`${t.slug} ~ ${SLUG}`),
    check("curso_descricao_tamanho", sql`char_length(${t.descricao}) <= 2000`),
    check("curso_topicos_validos", sql`topicos_validos(${t.topicos})`),
    check("curso_capa_alt_preenchido", sql`length(trim(${t.capaAlt})) > 0`),
    check(
      "curso_capa_dimensoes_positivas",
      sql`${t.capaLargura} > 0 and ${t.capaAltura} > 0`
    ),
    check(
      "curso_preco_troca_positivo",
      sql`${t.precoTroca} is null or ${t.precoTroca} > 0`
    ),
  ]
);

export const nivel = tabela(
  "nivel",
  {
    cursoId: uuid()
      .notNull()
      .references(() => curso.id, { onDelete: "cascade" })
      .$type<CursoId>(),
    nome: text().notNull(),
    ordem: smallint().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.cursoId, t.ordem] }),
    check("nivel_ordem_positiva", sql`${t.ordem} >= 1`),
  ]
);

export const modulo = tabela(
  "modulo",
  {
    cursoId: uuid()
      .notNull()
      .references(() => curso.id, { onDelete: "cascade" })
      .$type<CursoId>(),
    id: uuid().primaryKey().defaultRandom().$type<ModuloId>(),
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
    descricao: text().notNull().default(""),
    duracaoSeg: integer().notNull(),
    id: uuid().primaryKey().defaultRandom().$type<AulaId>(),
    moduloId: uuid()
      .notNull()
      .references(() => modulo.id, { onDelete: "cascade" })
      .$type<ModuloId>(),
    posicao: smallint().notNull(),
    titulo: text().notNull(),
    videoId: text().$type<VideoId>(),
    videoProvedor: videoProvedor(),
  },
  (t) => [
    unique("aula_posicao_unica").on(t.moduloId, t.posicao),
    check("aula_posicao_positiva", sql`${t.posicao} >= 1`),
    check("aula_duracao_positiva", sql`${t.duracaoSeg} > 0`),
    check("aula_descricao_tamanho", sql`char_length(${t.descricao}) <= 2000`),
    check(
      "aula_video_completo",
      sql`(${t.videoProvedor} is null) = (${t.videoId} is null)`
    ),
    check(
      "aula_video_formato",
      sql`${t.videoProvedor} is null or case ${t.videoProvedor}
            when 'youtube' then ${t.videoId} ~ '^[A-Za-z0-9_-]{11}$'
            else false
          end`
    ),
  ]
);

export const pergunta = tabela(
  "pergunta",
  {
    aulaId: uuid()
      .notNull()
      .references(() => aula.id, { onDelete: "cascade" })
      .$type<AulaId>(),
    enunciado: text().notNull(),
    id: uuid().primaryKey().defaultRandom().$type<PerguntaId>(),
    posicao: smallint().notNull(),
  },
  (t) => [
    unique("pergunta_posicao_unica").on(t.aulaId, t.posicao),
    check("pergunta_posicao_positiva", sql`${t.posicao} >= 1`),
    check(
      "pergunta_enunciado_formato",
      sql`${t.enunciado} = trim(${t.enunciado}) and char_length(${t.enunciado}) between 1 and 500`
    ),
  ]
);

export const alternativa = tabela(
  "alternativa",
  {
    certa: boolean().notNull().default(false),
    id: uuid().primaryKey().defaultRandom().$type<AlternativaId>(),
    perguntaId: uuid()
      .notNull()
      .references(() => pergunta.id, { onDelete: "cascade" })
      .$type<PerguntaId>(),
    posicao: smallint().notNull(),
    texto: text().notNull(),
  },
  (t) => [
    unique("alternativa_posicao_unica").on(t.perguntaId, t.posicao),
    uniqueIndex("alternativa_certa_unica")
      .on(t.perguntaId)
      .where(sql`${t.certa}`),
    check("alternativa_posicao_positiva", sql`${t.posicao} >= 1`),
    check(
      "alternativa_texto_formato",
      sql`${t.texto} = trim(${t.texto}) and char_length(${t.texto}) between 1 and 200`
    ),
  ]
);

export const material = tabela(
  "material",
  {
    bytes: integer().notNull(),
    chave: text().notNull(),
    cursoId: uuid()
      .notNull()
      .references(() => curso.id, { onDelete: "cascade" })
      .$type<CursoId>(),
    id: uuid().primaryKey().defaultRandom().$type<MaterialId>(),
    nomeDoArquivo: text().notNull(),
    posicao: smallint().notNull(),
    tipo: materialTipo().notNull(),
    titulo: text().notNull(),
  },
  (t) => [
    unique("material_posicao_unica").on(t.cursoId, t.posicao),
    check("material_posicao_positiva", sql`${t.posicao} >= 1`),
    check(
      "material_titulo_formato",
      sql`${t.titulo} = trim(${t.titulo}) and char_length(${t.titulo}) between 1 and 120`
    ),
    check(
      "material_nome_do_arquivo_tamanho",
      sql`char_length(${t.nomeDoArquivo}) between 1 and 200`
    ),
    check("material_bytes_limite", sql`${t.bytes} between 1 and 52428800`),
    check(
      "material_chave_formato",
      sql`${t.chave} ~ ('^[0-9a-f]{64}\\.' || ${t.tipo}::text || '$')`
    ),
  ]
);
