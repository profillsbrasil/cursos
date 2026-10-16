import type { Retomada } from "@cursos/api/dominio/painel";
import {
  caminhoDaAula as aula,
  caminhoDoCertificado as certificado,
  caminhoDaConferencia as conferencia,
  caminhoDoCurso as curso,
  caminhoDoQuestionario as questionario,
} from "@cursos/api/dominio/rotas";
import type { Route } from "next";

export const caminhoDoCurso = (slug: string) => curso(slug) as Route;

export const caminhoDaAula = (slug: string, aulaId: string) =>
  aula(slug, aulaId) as Route;

export const caminhoDoQuestionario = (slug: string, aulaId: string) =>
  questionario(slug, aulaId) as Route;

/** Para onde a retomada leva: a aula, ou o questionário dela quando só ele falta. O banner e o cartão do rodapé usam a mesma regra. */
export const hrefDaRetomada = (r: Retomada): Route =>
  r.tipo === "questionario"
    ? caminhoDoQuestionario(r.curso.slug, r.aula.id)
    : caminhoDaAula(r.curso.slug, r.aula.id);

export const caminhoDoCertificado = (slug: string) =>
  certificado(slug) as Route;

export const caminhoDaConferencia = (codigo: string) =>
  conferencia(codigo) as Route;
