import type { CursoId, StatusDoCurso, TrilhaId } from "./tipos";

export interface CursoNaVisao {
  aulas: number;
  id: CursoId;
  precoTroca: number | null;
  status: StatusDoCurso;
  titulo: string;
  /** null: curso solto, fora de trilha. */
  trilha: { id: TrilhaId; posicao: number; titulo: string } | null;
}

export interface TrilhaNaVisao {
  /** Pessoas com liberação ativa da própria trilha; liberação de curso avulso não conta. */
  alunos: number;
  cursos: number;
  id: TrilhaId;
  titulo: string;
}

export interface VisaoDoCatalogo {
  cursos: readonly CursoNaVisao[];
  trilhas: readonly TrilhaNaVisao[];
}
