import type { Database } from "@cursos/db";
import {
  aula,
  categoria,
  curso,
  modulo,
  pergunta,
} from "@cursos/db/schema/index";
import { eq, sql } from "drizzle-orm";

import type { VisaoDoCatalogo } from "../dominio/catalogo";
import { type CursoId, capaDe } from "../dominio/tipos";
import { COLUNAS_DA_CAPA } from "./comum";

export const COM_CONTEUDO = {
  columns: {
    ...COLUNAS_DA_CAPA,
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
    categoria: { columns: { nome: true } },
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
          extras: {
            // O callback recebe a aula com o alias da consulta; `aula.id` solto sairia sem alias.
            perguntas: (t: Pick<typeof aula, "id">) =>
              sql<number>`(select count(*)::int from ${pergunta} where ${pergunta.aulaId} = ${t.id})`.as(
                "perguntas"
              ),
          },
          orderBy: { posicao: "asc" },
        },
      },
    },
    niveis: { columns: { nome: true, ordem: true }, orderBy: { ordem: "asc" } },
  },
} as const;

/**
 * Tela /admin/catalogo, em um statement: os cursos por título, com a categoria,
 * os módulos, as aulas e a soma dos vídeos. O id desempata títulos iguais, para
 * a ordem não mudar entre um carregamento e outro.
 */
export async function visaoDoCatalogo(db: Database): Promise<VisaoDoCatalogo> {
  const cursos = await db
    .select({
      aulas: sql<number>`count(${aula.id})::int`,
      capaAlt: curso.capaAlt,
      capaAltura: curso.capaAltura,
      capaLargura: curso.capaLargura,
      capaUrl: curso.capaUrl,
      categoria: categoria.nome,
      codigo: curso.codigo,
      destaque: curso.destaque,
      id: curso.id,
      modulos: sql<number>`count(distinct ${modulo.id})::int`,
      precoTroca: curso.precoTroca,
      segundosDeVideo: sql<number>`coalesce(sum(${aula.duracaoSeg}), 0)::int`,
      status: curso.status,
      titulo: curso.titulo,
    })
    .from(curso)
    .innerJoin(categoria, eq(categoria.id, curso.categoriaId))
    .leftJoin(modulo, eq(modulo.cursoId, curso.id))
    .leftJoin(aula, eq(aula.moduloId, modulo.id))
    .groupBy(curso.id, categoria.id)
    .orderBy(curso.titulo, curso.id);
  return {
    cursos: cursos.map((c) => ({
      aulas: c.aulas,
      capa: capaDe(c),
      categoria: c.categoria,
      codigo: c.codigo,
      destaque: c.destaque,
      id: c.id as CursoId,
      modulos: c.modulos,
      precoTroca: c.precoTroca,
      segundosDeVideo: c.segundosDeVideo,
      status: c.status,
      titulo: c.titulo,
    })),
  };
}
