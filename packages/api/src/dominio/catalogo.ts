import type { Capa, CursoId, StatusDoCurso } from "./tipos";

/** O curso como a grade do catálogo do admin mostra: a capa e o tamanho dele. */
export interface CursoNaVisao {
  aulas: number;
  capa: Capa;
  categoria: string;
  codigo: string;
  id: CursoId;
  modulos: number;
  precoTroca: number | null;
  segundosDeVideo: number;
  status: StatusDoCurso;
  titulo: string;
}

export interface VisaoDoCatalogo {
  cursos: readonly CursoNaVisao[];
}
