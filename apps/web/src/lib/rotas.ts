import type { Retomada } from "@cursos/api/dominio/painel";
import {
  caminhoDaAula as aula,
  caminhoDoCurso as curso,
} from "@cursos/api/dominio/rotas";
import type { Route } from "next";

export const caminhoDaAula = (slug: string, aulaId: string) =>
  aula(slug, aulaId) as Route;

/** Para onde a retomada leva: a aula, ou a página do curso quando falta a prova. O banner e o cartão do rodapé usam a mesma regra. */
export const hrefDaRetomada = (r: Retomada): Route =>
  r.tipo === "prova"
    ? (curso(r.curso.slug) as Route)
    : caminhoDaAula(r.curso.slug, r.aula.id);
