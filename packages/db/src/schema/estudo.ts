import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  doublePrecision,
  foreignKey,
  index,
  integer,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { alternativa, aula, curso, pergunta } from "./catalogo";
import { momento, tabela } from "./comum";
import { faixasDeSegundos } from "./tipos-pg";

// Fato imutável. A chave (user_id, aula_id) faz "rever aula" não gravar de novo.
export const aulaAssistida = tabela(
  "aula_assistida",
  {
    assistidaEm: momento(),
    aulaId: uuid()
      .notNull()
      .references(() => aula.id, { onDelete: "restrict" }),
    // dia civil de São Paulo; o SQL é texto porque a coluna não enxerga a tabela aqui
    dia: date({ mode: "string" })
      .notNull()
      .generatedAlwaysAs(
        sql`((assistida_em at time zone 'America/Sao_Paulo')::date)`
      ),
    userId: text().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.aulaId] }),
    index("aula_assistida_por_dia").on(t.userId, t.dia),
  ]
);

export const posicaoAula = tabela(
  "posicao_aula",
  {
    atualizadaEm: momento(),
    aulaId: uuid()
      .notNull()
      .references(() => aula.id, { onDelete: "cascade" }),
    posicaoSeg: integer().notNull(),
    trechosVistos: faixasDeSegundos()
      .notNull()
      .default(sql`'{}'::int4multirange`),
    userId: text().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.aulaId] }),
    check("posicao_aula_nao_negativa", sql`${t.posicaoSeg} >= 0`),
    // lower() de multirange vazio é NULL, e check NULL passa: '{}' é válido.
    check(
      "posicao_aula_trechos_nao_negativos",
      sql`lower(${t.trechosVistos}) >= 0`
    ),
  ]
);

export const cotaVideo = tabela(
  "cota_video",
  {
    atualizadaEm: timestamp({ withTimezone: true }).notNull(),
    segundos: doublePrecision().notNull(),
    userId: text().primaryKey(),
  },
  (t) => [
    check("cota_video_nao_negativa", sql`${t.segundos} >= 0`),
    check("cota_video_user_id_clerk", sql`${t.userId} ~ '^user_[A-Za-z0-9]+$'`),
  ]
);

// Uma tentativa do questionário de uma aula. O id nasce no cliente, então reenviar
// a mesma tentativa não cria outra. acertos, total e aprovada são o fato no momento
// do envio: o admin pode mudar as perguntas depois, e a aprovação fica.
export const questionarioTentativa = tabela(
  "questionario_tentativa",
  {
    acertos: smallint().notNull(),
    aprovada: boolean().notNull(),
    aulaId: uuid()
      .notNull()
      .references(() => aula.id, { onDelete: "restrict" }),
    enviadaEm: momento(),
    id: uuid().primaryKey(),
    numero: smallint().notNull(),
    total: smallint().notNull(),
    userId: text().notNull(),
  },
  (t) => [
    check("tentativa_user_id_clerk", sql`${t.userId} ~ '^user_[A-Za-z0-9]+$'`),
    check("tentativa_numero_positivo", sql`${t.numero} >= 1`),
    check(
      "tentativa_acertos_no_total",
      sql`${t.total} >= 1 and ${t.acertos} between 0 and ${t.total}`
    ),
    unique("tentativa_numero_unico").on(t.userId, t.aulaId, t.numero),
    unique("tentativa_do_aluno").on(t.userId, t.id), // alvo da FK composta do lançamento
    // Depois de aprovar, não há outra tentativa daquela aula.
    uniqueIndex("tentativa_aprovada_unica")
      .on(t.userId, t.aulaId)
      .where(sql`${t.aprovada}`),
  ]
);

// A alternativa marcada em cada pergunta de uma tentativa. Pergunta ou alternativa
// que o admin apaga leva a resposta junto; a tentativa fica com a conta.
export const questionarioResposta = tabela(
  "questionario_resposta",
  {
    alternativaId: uuid()
      .notNull()
      .references(() => alternativa.id, { onDelete: "cascade" }),
    certa: boolean().notNull(),
    perguntaId: uuid()
      .notNull()
      .references(() => pergunta.id, { onDelete: "cascade" }),
    tentativaId: uuid().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.tentativaId, t.perguntaId] }),
    foreignKey({
      columns: [t.tentativaId],
      foreignColumns: [questionarioTentativa.id],
      name: "resposta_da_tentativa",
    }).onDelete("cascade"),
  ]
);

// O seed com --cloud cria um certificado de exemplo para o aluno A sem tentativa,
// então o certificado não aponta para tentativa nenhuma. A carga horária fica
// congelada na emissão: o certificado continua valendo se o curso ganhar aula.
export const certificado = tabela(
  "certificado",
  {
    codigo: text().notNull().unique(),
    cursoId: uuid()
      .notNull()
      .references(() => curso.id, { onDelete: "restrict" }),
    emitidoEm: momento(),
    id: uuid().primaryKey().defaultRandom(),
    /** A soma dos vídeos do curso no momento da emissão. */
    segundosDeVideo: integer().notNull(),
    userId: text().notNull(),
  },
  (t) => [
    unique("certificado_um_por_curso").on(t.userId, t.cursoId),
    check("certificado_segundos_nao_negativos", sql`${t.segundosDeVideo} >= 0`),
  ]
);
