import type { Database } from "@cursos/db";
import { comunicado, curso } from "@cursos/db/schema/index";
import { desc, eq, sql } from "drizzle-orm";

import type {
  CursoDoComunicado,
  LinhasDosComunicados,
} from "../dominio/comunicado";
import type { AdminId, ComunicadoId, CursoId } from "../dominio/tipos";
import { ErroParaAPessoa } from "../index";

// Único escritor de comunicado no app; o leitor do aluno é o statement 5 de linhasDoPainel.

export async function linhasDosComunicados(
  db: Database
): Promise<LinhasDosComunicados> {
  const [comunicados, cursos] = await Promise.all([
    db
      .select({
        cursoId: comunicado.cursoId,
        cursoTitulo: curso.titulo,
        id: comunicado.id,
        publicadoEm: comunicado.publicadoEm,
        publicadoPor: comunicado.publicadoPor,
        texto: comunicado.texto,
        titulo: comunicado.titulo,
      })
      .from(comunicado)
      .leftJoin(curso, eq(curso.id, comunicado.cursoId))
      .orderBy(desc(comunicado.publicadoEm), desc(comunicado.id)),
    db
      .select({ id: curso.id, titulo: curso.titulo })
      .from(curso)
      .orderBy(curso.titulo),
  ]);
  return {
    comunicados: comunicados.map((c) => ({
      curso:
        c.cursoId && c.cursoTitulo !== null
          ? { id: c.cursoId as CursoId, titulo: c.cursoTitulo }
          : null,
      id: c.id as ComunicadoId,
      publicadoEm: c.publicadoEm,
      publicadoPor: c.publicadoPor,
      texto: c.texto,
      titulo: c.titulo,
    })),
    cursos: cursos as CursoDoComunicado[],
  };
}

export interface ComunicadoEditado {
  /** null: geral. */
  cursoId: CursoId | null;
  /** Nasce no formulário: reenviar o mesmo comunicado não publica outro. */
  id: ComunicadoId;
  texto: string;
  titulo: string;
}

/**
 * Publica ou edita pelo id. Editar mantém publicado_em e publicado_por: o aluno
 * vê só o comunicado mais recente, e uma correção não deve trazer um aviso velho
 * de volta ao topo. O curso do alvo fica travado (key share) até o commit, então
 * apagá-lo no meio não troca a recusa por um erro de FK.
 */
export function salvarComunicado(
  db: Database,
  admin: AdminId,
  c: ComunicadoEditado,
  agora: Date
): Promise<{ id: ComunicadoId; novo: boolean }> {
  return db.transaction(async (tx) => {
    if (c.cursoId) {
      const [alvo] = await tx
        .select({ id: curso.id })
        .from(curso)
        .where(eq(curso.id, c.cursoId))
        .for("key share");
      if (!alvo) {
        throw new ErroParaAPessoa({
          code: "NOT_FOUND",
          message: "Este curso não existe mais. Escolha outro alvo.",
        });
      }
    }
    const [linha] = await tx
      .insert(comunicado)
      .values({
        cursoId: c.cursoId,
        id: c.id,
        publicadoEm: agora,
        publicadoPor: admin,
        texto: c.texto,
        titulo: c.titulo,
      })
      .onConflictDoUpdate({
        set: { cursoId: c.cursoId, texto: c.texto, titulo: c.titulo },
        target: comunicado.id,
      })
      // xmax = 0 só na linha que o INSERT criou; na que o ON CONFLICT atualizou, não.
      .returning({ novo: sql<boolean>`xmax = 0` });
    if (!linha) {
      throw new Error("O upsert do comunicado não devolveu a linha.");
    }
    return { id: c.id, novo: linha.novo };
  });
}

/** Apagar o que já não existe devolve { apagado: false }. */
export async function apagarComunicado(
  db: Database,
  id: ComunicadoId
): Promise<{ apagado: boolean }> {
  const apagados = await db
    .delete(comunicado)
    .where(eq(comunicado.id, id))
    .returning({ id: comunicado.id });
  return { apagado: apagados.length > 0 };
}
