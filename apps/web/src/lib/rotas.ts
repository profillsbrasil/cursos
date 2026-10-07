import type { Route } from "next";

export const caminhoDaAula = (slug: string, aulaId: string) =>
  `/cursos/${slug}/aulas/${aulaId}` as Route;
