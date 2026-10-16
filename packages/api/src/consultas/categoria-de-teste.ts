import type { Database } from "@cursos/db";
import { categoria } from "@cursos/db/schema/index";
import { eq } from "drizzle-orm";

import type { CategoriaId } from "../dominio/tipos";

const NOME = "Categoria dos testes";

/**
 * Os testes de integração que plantam curso apontam para esta categoria. Ela fica
 * no banco local entre as execuções, e criar de novo em paralelo não duplica.
 */
export async function categoriaDeTeste(db: Database): Promise<CategoriaId> {
  await db
    .insert(categoria)
    .values({ nome: NOME })
    .onConflictDoNothing({ target: categoria.nome });
  const [linha] = await db
    .select({ id: categoria.id })
    .from(categoria)
    .where(eq(categoria.nome, NOME));
  if (!linha) {
    throw new Error("A categoria dos testes não foi criada.");
  }
  return linha.id as CategoriaId;
}
