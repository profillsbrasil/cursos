// O material de apoio como o aluno o lê: a lista da página do curso e a porta do
// download. O único escritor da tabela material é salvarCurso
// (consultas/edicao-do-curso.ts).

import type { Database } from "@cursos/db";
import { curso, material } from "@cursos/db/schema/index";
import { asc, eq } from "drizzle-orm";

import { ehAdmin, type Sessao } from "../context";
import { montarCursoAberto } from "../dominio/aula";
import type { MaterialDaPagina, TipoDoMaterial } from "../dominio/material";
import { caminhoDoMaterial } from "../dominio/rotas";
import type { MaterialId } from "../dominio/tipos";
import { linhasDoCurso } from "./aula";
import type { Executor } from "./comum";

/** Em ordem de posição. */
export async function materiaisDaPagina(
  exec: Executor,
  slug: string
): Promise<MaterialDaPagina[]> {
  const linhas = await exec
    .select({
      bytes: material.bytes,
      id: material.id,
      nomeDoArquivo: material.nomeDoArquivo,
      tipo: material.tipo,
      titulo: material.titulo,
    })
    .from(material)
    .innerJoin(curso, eq(curso.id, material.cursoId))
    .where(eq(curso.slug, slug))
    .orderBy(asc(material.posicao));
  return linhas.map((m) => ({
    ...m,
    href: caminhoDoMaterial(m.id),
    id: m.id as MaterialId,
  }));
}

export interface MaterialParaBaixar {
  chave: string;
  nomeDoArquivo: string;
  tipo: TipoDoMaterial;
}

/**
 * O admin baixa qualquer material. O aluno, só o do curso que a página do curso
 * abre para ele: a mesma porta, montarCursoAberto (liberação ativa e curso que
 * não está em produção). Para os outros, null, que a rota responde como 404.
 */
export async function materialParaBaixar(
  db: Database,
  sessao: Sessao,
  id: MaterialId
): Promise<MaterialParaBaixar | null> {
  const [achado] = await db
    .select({
      chave: material.chave,
      nomeDoArquivo: material.nomeDoArquivo,
      slug: curso.slug,
      tipo: material.tipo,
    })
    .from(material)
    .innerJoin(curso, eq(curso.id, material.cursoId))
    .where(eq(material.id, id));
  if (!achado) {
    return null;
  }
  const { slug, ...arquivo } = achado;
  if (ehAdmin(sessao)) {
    return arquivo;
  }
  const aberto = montarCursoAberto(
    await linhasDoCurso(db, sessao.userId, { slug }, { serial: false })
  );
  return aberto ? arquivo : null;
}
