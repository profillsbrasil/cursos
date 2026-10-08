import { pgEnum, snakeCase, timestamp } from "drizzle-orm/pg-core";

import { ORIGEM_DA_LIBERACAO, STATUS_DO_CURSO } from "./formatos";

export const tabela = snakeCase.table;

export const cursoStatus = pgEnum("curso_status", STATUS_DO_CURSO);

export const liberacaoOrigem = pgEnum("liberacao_origem", ORIGEM_DA_LIBERACAO);

export const motivoPonto = pgEnum("motivo_ponto", [
  "aula_assistida",
  "curso_concluido",
  "trilha_concluida",
  "sequencia_7_dias",
  "troca",
]);

export const videoProvedor = pgEnum("video_provedor", ["youtube"]);

export const momento = () =>
  timestamp({ withTimezone: true }).notNull().defaultNow();

export const SLUG = "^[a-z0-9]+(-[a-z0-9]+)*$";
