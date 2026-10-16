import type { Database } from "@cursos/db";
import { categoria, certificado, curso } from "@cursos/db/schema/index";
import { and, eq } from "drizzle-orm";

import type { Servicos } from "../context";
import { montarCursoAberto } from "../dominio/aula";
import type { CodigoDoCertificado } from "../dominio/certificado";
import {
  type CertificadoEmitido,
  certificadoEmitido,
  type LinhaDoCertificado,
  type PaginaDoCertificado,
  paginaEmitida,
  paginaQueFalta,
} from "../dominio/pagina-do-certificado";
import { linhasDoCurso } from "./aula";

type Onde = { codigo: CodigoDoCertificado } | { slug: string; userId: string };

export async function linhaDoCertificado(
  db: Database,
  onde: Onde
): Promise<LinhaDoCertificado | null> {
  const [linha] = await db
    .select({
      categoria: categoria.nome,
      codigo: certificado.codigo,
      emitidoEm: certificado.emitidoEm,
      segundosDeVideo: certificado.segundosDeVideo,
      slug: curso.slug,
      tituloDoCurso: curso.titulo,
      userId: certificado.userId,
    })
    .from(certificado)
    .innerJoin(curso, eq(curso.id, certificado.cursoId))
    .innerJoin(categoria, eq(categoria.id, curso.categoriaId))
    .where(
      "codigo" in onde
        ? eq(certificado.codigo, onde.codigo)
        : and(eq(certificado.userId, onde.userId), eq(curso.slug, onde.slug))
    );
  return linha ?? null;
}

export async function carregarPaginaDoCertificado(
  { db, pessoas }: Servicos,
  userId: string,
  slug: string
): Promise<PaginaDoCertificado | null> {
  const linha = await linhaDoCertificado(db, { slug, userId });
  if (linha) {
    return paginaEmitida(linha, await pessoas.porId(userId));
  }
  const aberto = montarCursoAberto(
    await linhasDoCurso(db, userId, { slug }, { serial: false })
  );
  return aberto && paginaQueFalta(aberto);
}

export async function conferir(
  { db, pessoas }: Servicos,
  codigo: CodigoDoCertificado
): Promise<CertificadoEmitido | null> {
  const linha = await linhaDoCertificado(db, { codigo });
  return linha && certificadoEmitido(linha, await pessoas.porId(linha.userId));
}
