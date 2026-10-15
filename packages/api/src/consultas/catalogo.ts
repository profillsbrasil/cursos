import type { Database } from "@cursos/db";
import { aula, curso, modulo } from "@cursos/db/schema/index";
import { eq, sql } from "drizzle-orm";

import type { VisaoDoCatalogo } from "../dominio/catalogo";
import type { CursoId } from "../dominio/tipos";
import { COLUNAS_DA_CAPA } from "./comum";

export const COM_CONTEUDO = {
  columns: {
    ...COLUNAS_DA_CAPA,
    categoria: true,
    codigo: true,
    descricao: true,
    destaque: true,
    id: true,
    slug: true,
    status: true,
    titulo: true,
    topicos: true,
  },
  with: {
    modulos: {
      columns: { nivelOrdem: true, numero: true, titulo: true },
      orderBy: { numero: "asc" },
      with: {
        aulas: {
          columns: {
            descricao: true,
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

/**
 * Tela /admin/catalogo, em um statement: os cursos por título. O id desempata
 * títulos iguais, para a ordem não mudar entre um carregamento e outro.
 */
export async function visaoDoCatalogo(db: Database): Promise<VisaoDoCatalogo> {
  const cursos = await db
    .select({
      aulas: sql<number>`count(${aula.id})::int`,
      id: curso.id,
      precoTroca: curso.precoTroca,
      status: curso.status,
      titulo: curso.titulo,
    })
    .from(curso)
    .leftJoin(modulo, eq(modulo.cursoId, curso.id))
    .leftJoin(aula, eq(aula.moduloId, modulo.id))
    .groupBy(curso.id)
    .orderBy(curso.titulo, curso.id);
  return { cursos: cursos.map((c) => ({ ...c, id: c.id as CursoId })) };
}
