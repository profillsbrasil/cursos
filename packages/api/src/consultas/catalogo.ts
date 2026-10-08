import type { Database } from "@cursos/db";
import type { cursoStatus } from "@cursos/db/schema/comum";
import {
  aula,
  curso,
  liberacao,
  modulo,
  trilha,
  trilhaCurso,
} from "@cursos/db/schema/index";
import { and, eq, isNull, sql } from "drizzle-orm";

import type { CursoId, TrilhaId } from "../dominio/tipos";

export const COM_CONTEUDO = {
  columns: {
    capaAlt: true,
    capaUrl: true,
    codigo: true,
    destaque: true,
    id: true,
    slug: true,
    status: true,
    tema: true,
    titulo: true,
  },
  with: {
    modulos: {
      columns: { nivelOrdem: true, numero: true, titulo: true },
      orderBy: { numero: "asc" },
      with: {
        aulas: {
          columns: {
            duracaoSeg: true,
            id: true,
            posicao: true,
            titulo: true,
            videoId: true,
            videoProvedor: true,
          },
          orderBy: { posicao: "asc" },
        },
      },
    },
    niveis: { columns: { nome: true, ordem: true }, orderBy: { ordem: "asc" } },
  },
} as const;

export type StatusDoCurso = (typeof cursoStatus.enumValues)[number];

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
  /** Pessoas com liberação ativa da trilha. */
  alunos: number;
  cursos: number;
  id: TrilhaId;
  titulo: string;
}

export interface VisaoDoCatalogo {
  cursos: readonly CursoNaVisao[];
  trilhas: readonly TrilhaNaVisao[];
}

/**
 * Tela /admin/catalogo, em dois statements paralelos. Trilhas por título; cursos
 * na ordem das trilhas (título, depois posição) e os soltos no fim, por título.
 */
export async function visaoDoCatalogo(db: Database): Promise<VisaoDoCatalogo> {
  const [cursos, trilhas] = await Promise.all([
    db
      .select({
        aulas: sql<number>`count(${aula.id})::int`,
        id: curso.id,
        posicao: trilhaCurso.posicao,
        precoTroca: curso.precoTroca,
        status: curso.status,
        titulo: curso.titulo,
        trilhaId: trilha.id,
        trilhaTitulo: trilha.titulo,
      })
      .from(curso)
      .leftJoin(trilhaCurso, eq(trilhaCurso.cursoId, curso.id))
      .leftJoin(trilha, eq(trilha.id, trilhaCurso.trilhaId))
      .leftJoin(modulo, eq(modulo.cursoId, curso.id))
      .leftJoin(aula, eq(aula.moduloId, modulo.id))
      .groupBy(curso.id, trilhaCurso.cursoId, trilha.id)
      .orderBy(
        sql`${trilha.titulo} asc nulls last`,
        trilhaCurso.posicao,
        curso.titulo
      ),
    db
      .select({
        alunos: sql<number>`count(distinct ${liberacao.userId})::int`,
        cursos: sql<number>`count(distinct ${trilhaCurso.cursoId})::int`,
        id: trilha.id,
        titulo: trilha.titulo,
      })
      .from(trilha)
      .leftJoin(trilhaCurso, eq(trilhaCurso.trilhaId, trilha.id))
      .leftJoin(
        liberacao,
        and(eq(liberacao.trilhaId, trilha.id), isNull(liberacao.revogadaEm))
      )
      .groupBy(trilha.id)
      .orderBy(trilha.titulo),
  ]);
  return {
    cursos: cursos.map((c) => ({
      aulas: c.aulas,
      id: c.id as CursoId,
      precoTroca: c.precoTroca,
      status: c.status,
      titulo: c.titulo,
      trilha:
        c.trilhaId === null || c.trilhaTitulo === null || c.posicao === null
          ? null
          : {
              id: c.trilhaId as TrilhaId,
              posicao: c.posicao,
              titulo: c.trilhaTitulo,
            },
    })),
    trilhas: trilhas.map((t) => ({ ...t, id: t.id as TrilhaId })),
  };
}
