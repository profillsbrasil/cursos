import { pgEnum, snakeCase, timestamp } from "drizzle-orm/pg-core";

export const tabela = snakeCase.table;

export const cursoStatus = pgEnum("curso_status", ["em_producao", "publicado"]);

// troca, quiz_acerto e prova_aprovada entram com a coluna de referência no PR de cada um
export const motivoPonto = pgEnum("motivo_ponto", [
  "aula_assistida",
  "curso_concluido",
  "trilha_concluida",
  "sequencia_7_dias",
]);

export const momento = () =>
  timestamp({ withTimezone: true }).notNull().defaultNow();

export const SLUG = "^[a-z0-9]+(-[a-z0-9]+)*$";
