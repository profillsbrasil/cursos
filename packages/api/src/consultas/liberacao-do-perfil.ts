import type { Database } from "@cursos/db";
import { liberacaoDoPerfil } from "@cursos/db/schema/index";
import { and, eq, isNull, sql } from "drizzle-orm";

import type { LinhaDaGrade } from "../dominio/grade-dos-perfis";
import type { Perfil } from "../dominio/perfil";
import type { AdminId, CursoId, LiberacaoDoPerfilId } from "../dominio/tipos";
import { ErroParaAPessoa } from "../index";
import { COLUNAS_DA_CAPA } from "./comum";
import { violacaoDe } from "./erros";

const ATIVA_UNICA = "liberacao_do_perfil_ativa_unica";
const FK_DO_CURSO = "liberacao_do_perfil_curso_id_curso_id_fkey";

const cursoSumiu = (cause?: unknown) =>
  new ErroParaAPessoa({
    cause,
    code: "NOT_FOUND",
    message: "Este curso não existe mais.",
  });

async function ativa(
  db: Database,
  perfil: Perfil,
  cursoId: CursoId
): Promise<LiberacaoDoPerfilId | null> {
  const linha = await db.query.liberacaoDoPerfil.findFirst({
    columns: { id: true },
    where: { cursoId, perfil, revogadaEm: { isNull: true } },
  });
  return (linha?.id as LiberacaoDoPerfilId | undefined) ?? null;
}

/**
 * Abre o curso a todo mundo do perfil. Liberar o que já está ativo devolve a
 * liberação existente. Nenhuma trava de aluno: a liberação vale para quem tiver o
 * perfil, e o índice liberacao_do_perfil_ativa_unica segura duas ao mesmo tempo.
 */
export async function liberarParaPerfil(
  db: Database,
  admin: AdminId,
  perfil: Perfil,
  cursoId: CursoId,
  agora: Date
): Promise<{ id: LiberacaoDoPerfilId; nova: boolean }> {
  const existente = await ativa(db, perfil, cursoId);
  if (existente) {
    return { id: existente, nova: false };
  }
  try {
    const [linha] = await db
      .insert(liberacaoDoPerfil)
      .values({ cursoId, liberadaEm: agora, liberadaPor: admin, perfil })
      .returning({ id: liberacaoDoPerfil.id });
    if (!linha) {
      throw new Error("O insert da liberação do perfil não devolveu a linha.");
    }
    return { id: linha.id as LiberacaoDoPerfilId, nova: true };
  } catch (erro) {
    const restricao = violacaoDe(erro)?.restricao;
    if (restricao === FK_DO_CURSO) {
      throw cursoSumiu(erro);
    }
    // Outro admin liberou entre a leitura e o insert: a dele vale.
    const ganhadora =
      restricao === ATIVA_UNICA ? await ativa(db, perfil, cursoId) : null;
    if (ganhadora) {
      return { id: ganhadora, nova: false };
    }
    throw erro;
  }
}

/**
 * Fecha o curso para o perfil. A linha fica, com a data e quem revogou; revogar de
 * novo não muda nada. O estudo de quem via o curso pelo perfil fica guardado.
 */
export async function revogarDoPerfil(
  db: Database,
  admin: AdminId,
  id: LiberacaoDoPerfilId,
  agora: Date
): Promise<{ revogada: boolean }> {
  const linhas = await db
    .update(liberacaoDoPerfil)
    .set({
      // O relógio do app pode estar atrás do now() do banco (liberacao_do_perfil_revogacao_coerente).
      revogadaEm: sql`greatest(${agora}::timestamptz, ${liberacaoDoPerfil.liberadaEm})`,
      revogadaPor: admin,
    })
    .where(
      and(eq(liberacaoDoPerfil.id, id), isNull(liberacaoDoPerfil.revogadaEm))
    )
    .returning({ id: liberacaoDoPerfil.id });
  return { revogada: linhas.length > 0 };
}

/** A aba Por perfil: todo curso, com as liberações ativas de cada perfil, num statement. */
export function linhasDaGrade(db: Database): Promise<LinhaDaGrade[]> {
  return db.query.curso.findMany({
    columns: { ...COLUNAS_DA_CAPA, id: true, status: true, titulo: true },
    orderBy: { titulo: "asc" },
    with: {
      liberacoesDoPerfil: {
        columns: { id: true, perfil: true },
        where: { revogadaEm: { isNull: true } },
      },
      modulos: { columns: {}, with: { aulas: { columns: { id: true } } } },
    },
  });
}
