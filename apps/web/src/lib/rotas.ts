import type { Route } from "next";

/** A única fonte das URLs de aula: banner, coluna, Anterior e Próxima usam esta função. */
export const caminhoDaAula = (slug: string, aulaId: string) =>
  `/cursos/${slug}/aulas/${aulaId}` as Route;
