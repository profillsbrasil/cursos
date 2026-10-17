import type { StatusDoCurso } from "@cursos/api/dominio/tipos";

/**
 * A grade do catálogo do admin, também no esqueleto: colunas de 250 px ou mais
 * que enchem a largura. Fica fora do módulo "use client" do filtro, porque o
 * loading.tsx, Server Component, também a usa.
 */
export const GRADE_DO_CATALOGO =
  "grid grid-cols-[repeat(auto-fill,minmax(min(100%,250px),1fr))] gap-x-5 gap-y-7";

/** Acima disso a grade ganha os filtros de status; acima de 6, também a busca. */
export const CURSOS_SEM_FILTRO = 3;
export const CURSOS_SEM_BUSCA = 6;

export type FiltroDeStatus = "todos" | StatusDoCurso;

const ACENTOS = /\p{Diacritic}/gu;

const normalizado = (texto: string) =>
  texto.normalize("NFD").replace(ACENTOS, "").toLocaleLowerCase("pt-BR");

/** A busca ignora acento e caixa: "fabrica" acha "Fábrica e montagem". */
export function noFiltro(
  curso: { status: StatusDoCurso; titulo: string },
  filtro: FiltroDeStatus,
  busca: string
) {
  return (
    (filtro === "todos" || curso.status === filtro) &&
    normalizado(curso.titulo).includes(normalizado(busca.trim()))
  );
}
