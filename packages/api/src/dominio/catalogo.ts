import type { Capa, CursoId, StatusDoCurso } from "./tipos";

export interface CursoNaVisao {
  aulas: number;
  capa: Capa;
  id: CursoId;
  precoTroca: number | null;
  status: StatusDoCurso;
  titulo: string;
}

export interface VisaoDoCatalogo {
  cursos: readonly CursoNaVisao[];
}
