import type { Retomada } from "@cursos/api/dominio/painel";
import type { Route } from "next";

export const caminhoDaAula = (slug: string, aulaId: string) =>
  `/cursos/${slug}/aulas/${aulaId}` as Route;

/** Para onde a retomada leva: a aula, ou a página do curso quando falta a prova. O banner e o cartão do rodapé usam a mesma regra. */
export const hrefDaRetomada = (r: Retomada): Route =>
  r.tipo === "prova"
    ? (`/cursos/${r.curso.slug}` as Route)
    : caminhoDaAula(r.curso.slug, r.aula.id);
