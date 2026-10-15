// Único escritor de categoria. Quem aponta um curso para uma categoria
// (salvarCurso) a lê com FOR KEY SHARE, e apagarCategoria a trava com FOR UPDATE
// antes de contar: as duas se serializam, e a FK curso_categoria_id nunca dispara
// pelo app.

import type { Database } from "@cursos/db";
import { categoria, curso } from "@cursos/db/schema/index";
import { count, eq, sql } from "drizzle-orm";

import { type CategoriaNaLista, categoriaEmUso } from "../dominio/categoria";
import type { CategoriaId } from "../dominio/tipos";
import { ErroParaAPessoa } from "../index";

/** Por nome, com a contagem de cursos. Um statement. */
export async function listarCategorias(
  db: Database
): Promise<CategoriaNaLista[]> {
  const linhas = await db
    .select({
      cursos: sql<number>`count(${curso.id})::int`,
      id: categoria.id,
      nome: categoria.nome,
    })
    .from(categoria)
    .leftJoin(curso, eq(curso.categoriaId, categoria.id))
    .groupBy(categoria.id)
    .orderBy(categoria.nome, categoria.id);
  return linhas.map((l) => ({ ...l, id: l.id as CategoriaId }));
}

/**
 * Cria ou renomeia pelo id que nasce no cliente: reenviar não duplica. O nome
 * repetido cai em categoria_nome_unico, que tem frase em erros.ts.
 */
export async function salvarCategoria(
  db: Database,
  c: { id: CategoriaId; nome: string }
): Promise<{ id: CategoriaId; novo: boolean }> {
  const [linha] = await db
    .insert(categoria)
    .values(c)
    .onConflictDoUpdate({ set: { nome: c.nome }, target: categoria.id })
    // xmax = 0 só na linha que o INSERT criou; na que o ON CONFLICT atualizou, não.
    .returning({ novo: sql<boolean>`xmax = 0` });
  if (!linha) {
    throw new Error("O upsert da categoria não devolveu a linha.");
  }
  return { id: c.id, novo: linha.novo };
}

/** Apagar o que já não existe devolve { apagado: false }. */
export function apagarCategoria(
  db: Database,
  id: CategoriaId
): Promise<{ apagado: boolean }> {
  return db.transaction(async (tx) => {
    const [alvo] = await tx
      .select({ id: categoria.id })
      .from(categoria)
      .where(eq(categoria.id, id))
      .for("update");
    if (!alvo) {
      return { apagado: false };
    }
    // Depois da trava, num statement novo: vê o curso que comitou enquanto esta esperava.
    const [uso] = await tx
      .select({ cursos: count() })
      .from(curso)
      .where(eq(curso.categoriaId, id));
    const cursos = uso?.cursos ?? 0;
    if (cursos > 0) {
      throw new ErroParaAPessoa({
        code: "PRECONDITION_FAILED",
        message: categoriaEmUso(cursos),
      });
    }
    await tx.delete(categoria).where(eq(categoria.id, id));
    return { apagado: true };
  });
}
