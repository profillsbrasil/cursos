import { PERFIS, type Perfil } from "./perfil";
import type { ContagemPorPerfil } from "./pessoas";
import {
  type Capa,
  type CursoId,
  capaDe,
  type LiberacaoDoPerfilId,
  type LinhaDaCapa,
  type StatusDoCurso,
} from "./tipos";

/** Um curso na aba Por perfil: a liberação ativa de cada perfil, quando há. */
export interface CursoNaGrade {
  aulas: number;
  capa: Capa;
  id: CursoId;
  liberacoes: Readonly<Record<Perfil, LiberacaoDoPerfilId | null>>;
  status: StatusDoCurso;
  titulo: string;
}

export interface GradeDosPerfis {
  /** Quem já entrou no app, por perfil: quantas pessoas uma liberação alcança hoje. */
  contagem: ContagemPorPerfil;
  cursos: readonly CursoNaGrade[];
}

export interface LinhaDaGrade extends LinhaDaCapa {
  id: string;
  liberacoesDoPerfil: readonly { id: string; perfil: Perfil }[];
  modulos: readonly { aulas: readonly unknown[] }[];
  status: StatusDoCurso;
  titulo: string;
}

export function montarGrade(
  linhas: readonly LinhaDaGrade[],
  contagem: ContagemPorPerfil
): GradeDosPerfis {
  return {
    contagem,
    cursos: linhas.map((c) => ({
      aulas: c.modulos.reduce((n, m) => n + m.aulas.length, 0),
      capa: capaDe(c),
      id: c.id as CursoId,
      liberacoes: Object.fromEntries(
        PERFIS.map((p) => [
          p,
          (c.liberacoesDoPerfil.find((l) => l.perfil === p)?.id ??
            null) as LiberacaoDoPerfilId | null,
        ])
      ) as Record<Perfil, LiberacaoDoPerfilId | null>,
      status: c.status,
      titulo: c.titulo,
    })),
  };
}
