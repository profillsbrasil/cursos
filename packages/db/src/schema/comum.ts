import { pgEnum, snakeCase, timestamp } from "drizzle-orm/pg-core";

import {
  ORIGEM_DA_LIBERACAO,
  PERFIS,
  STATUS_DO_CURSO,
  TIPO_DO_MATERIAL,
} from "./formatos";

export const tabela = snakeCase.table;

export const cursoStatus = pgEnum("curso_status", STATUS_DO_CURSO);

export const liberacaoOrigem = pgEnum("liberacao_origem", ORIGEM_DA_LIBERACAO);

export const perfil = pgEnum("perfil", PERFIS);

export const motivoPonto = pgEnum("motivo_ponto", [
  "aula_assistida",
  "bonus_funcionario",
  "concessao",
  "curso_concluido",
  "questionario",
  "sequencia_7_dias",
  "troca",
]);

export const materialTipo = pgEnum("material_tipo", TIPO_DO_MATERIAL);

export const videoProvedor = pgEnum("video_provedor", ["youtube"]);

export const momento = () =>
  timestamp({ withTimezone: true }).notNull().defaultNow();
