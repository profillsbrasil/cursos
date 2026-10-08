import type { Database } from "@cursos/db";
import { liberacao } from "@cursos/db/schema/index";
import { TRPCError } from "@trpc/server";
import { and, eq, isNull, sql } from "drizzle-orm";

import {
  type AcessoDoAluno,
  type Alvo,
  decidirLiberar,
  decidirRevogar,
  type LinhaDaLiberacao,
  montarAcesso,
} from "../dominio/liberacao";
import type {
  AdminId,
  CursoId,
  LiberacaoId,
  Pessoa,
  TrilhaId,
} from "../dominio/tipos";
import { type Executor, filtroLiberacaoAtiva } from "./comum";
import { type AlunoTravado, comAlunoTravado } from "./trava";

export type NovaLiberacao =
  | { alvo: Alvo; origem: "admin"; por: AdminId }
  /** Na troca o autor é o próprio aluno, e o alvo é sempre um curso (liberacao_troca_pelo_aluno). */
  | { alvo: { tipo: "curso"; id: CursoId }; origem: "troca" };

/**
 * Único INSERT em liberacao do app. Não decide nada: quem chama já decidiu com o
 * aluno travado. A violação dos índices de liberação ativa sobe como está.
 */
export async function inserirLiberacao(
  aluno: AlunoTravado,
  nova: NovaLiberacao,
  agora: Date
): Promise<LiberacaoId> {
  const { alvo } = nova;
  const [linha] = await aluno.tx
    .insert(liberacao)
    .values({
      cursoId: alvo.tipo === "curso" ? alvo.id : null,
      liberadaEm: agora,
      liberadaPor: nova.origem === "admin" ? nova.por : aluno.userId,
      origem: nova.origem,
      trilhaId: alvo.tipo === "trilha" ? alvo.id : null,
      userId: aluno.userId,
    })
    .returning({ id: liberacao.id });
  if (!linha) {
    throw new Error("O insert da liberação não devolveu a linha.");
  }
  return linha.id as LiberacaoId;
}

const COM_O_ALVO = {
  columns: {
    cursoId: true,
    id: true,
    liberadaEm: true,
    origem: true,
    revogadaEm: true,
    trilhaId: true,
  },
  with: {
    curso: { columns: { titulo: true } },
    trilha: { columns: { titulo: true } },
  },
} as const;

interface LinhaComOAlvo {
  curso: { titulo: string } | null;
  cursoId: string | null;
  id: string;
  liberadaEm: Date;
  origem: LinhaDaLiberacao["origem"];
  revogadaEm: Date | null;
  trilha: { titulo: string } | null;
  trilhaId: string | null;
}

function paraLinha(l: LinhaComOAlvo): LinhaDaLiberacao {
  let alvo: LinhaDaLiberacao["alvo"];
  if (l.cursoId && l.curso) {
    alvo = { id: l.cursoId as CursoId, tipo: "curso", titulo: l.curso.titulo };
  } else if (l.trilhaId && l.trilha) {
    alvo = {
      id: l.trilhaId as TrilhaId,
      tipo: "trilha",
      titulo: l.trilha.titulo,
    };
  } else {
    throw new Error(`Liberação ${l.id} sem alvo.`);
  }
  return {
    alvo,
    id: l.id as LiberacaoId,
    liberadaEm: l.liberadaEm,
    origem: l.origem,
    revogadaEm: l.revogadaEm,
  };
}

/**
 * Liberações do aluno com o título do alvo. Dentro de comAlunoTravado, passe
 * aluno.tx: o statement nasce depois da trava e vê o que a transação concorrente
 * do mesmo aluno comitou enquanto esta esperava.
 */
export async function linhasDasLiberacoes(
  exec: Executor,
  userId: string,
  filtro: "ativas" | "todas"
): Promise<LinhaDaLiberacao[]> {
  const linhas = await exec.query.liberacao.findMany({
    ...COM_O_ALVO,
    where: filtro === "ativas" ? filtroLiberacaoAtiva(userId) : { userId },
  });
  return linhas.map(paraLinha);
}

async function alvoExiste(exec: Executor, alvo: Alvo): Promise<boolean> {
  const where = { id: alvo.id };
  const linha =
    alvo.tipo === "curso"
      ? await exec.query.curso.findFirst({ columns: { id: true }, where })
      : await exec.query.trilha.findFirst({ columns: { id: true }, where });
  return linha !== undefined;
}

/**
 * Admin libera trilha ou curso. Com a trava do aluno, uma troca concorrente
 * espera, lê a liberação nova e devolve "já tem" sem debitar. Liberar o que já
 * está ativo devolve a liberação existente. Quem chama já conferiu no Clerk que
 * a pessoa existe.
 */
export function liberar(
  db: Database,
  admin: AdminId,
  userId: string,
  alvo: Alvo,
  agora: Date
): Promise<{ liberacaoId: LiberacaoId; nova: boolean }> {
  return comAlunoTravado(db, userId, async (aluno) => {
    const [existe, ativas] = await Promise.all([
      alvoExiste(aluno.tx, alvo),
      linhasDasLiberacoes(aluno.tx, aluno.userId, "ativas"),
    ]);
    const d = decidirLiberar(existe, ativas, alvo);
    switch (d.tipo) {
      case "recusa":
        throw new TRPCError({
          code: "NOT_FOUND",
          message:
            alvo.tipo === "curso"
              ? "Este curso não existe mais."
              : "Esta trilha não existe mais.",
        });
      case "ja_liberada":
        return { liberacaoId: d.liberacaoId, nova: false };
      case "inserir":
        return {
          liberacaoId: await inserirLiberacao(
            aluno,
            { alvo, origem: "admin", por: admin },
            agora
          ),
          nova: true,
        };
      default:
        return d satisfies never;
    }
  });
}

/**
 * Admin revoga. O user_id da liberação não muda, então ele é lido antes da trava;
 * a linha é relida depois dela. revogada_em nunca fica antes de liberada_em, mesmo
 * com o relógio do app atrás do now() do banco (liberacao_revogacao_coerente).
 * Revogar o que já foi revogado é sucesso e não muda a linha.
 */
export async function revogar(
  db: Database,
  admin: AdminId,
  liberacaoId: LiberacaoId,
  agora: Date
): Promise<{ revogada: boolean }> {
  const dono = await db.query.liberacao.findFirst({
    columns: { userId: true },
    where: { id: liberacaoId },
  });
  if (!dono) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Esta liberação não existe.",
    });
  }
  return comAlunoTravado(db, dono.userId, async (aluno) => {
    const linha = await aluno.tx.query.liberacao.findFirst({
      ...COM_O_ALVO,
      where: { id: liberacaoId },
    });
    if (!linha) {
      throw new Error(`Liberação ${liberacaoId} sumiu com o aluno travado.`);
    }
    const d = decidirRevogar(paraLinha(linha));
    switch (d.tipo) {
      case "recusa":
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Liberação de troca não se revoga. O aluno pagou por ela com pontos.",
        });
      case "ja_revogada":
        return { revogada: false };
      case "revogar":
        await aluno.tx
          .update(liberacao)
          .set({
            revogadaEm: sql`greatest(${agora}::timestamptz, ${liberacao.liberadaEm})`,
            revogadaPor: admin,
          })
          .where(
            and(eq(liberacao.id, liberacaoId), isNull(liberacao.revogadaEm))
          );
        return { revogada: true };
      default:
        return d satisfies never;
    }
  });
}

/** Tela /admin/alunos/[userId]: todas as liberações da pessoa e o catálogo, em paralelo. */
export async function carregarAcesso(
  db: Database,
  userId: string,
  pessoa: Pessoa | null
): Promise<AcessoDoAluno | null> {
  const [liberacoes, cursos, trilhas] = await Promise.all([
    linhasDasLiberacoes(db, userId, "todas"),
    db.query.curso.findMany({
      columns: { id: true, titulo: true },
      orderBy: { titulo: "asc" },
      with: { naTrilha: { columns: { trilhaId: true } } },
    }),
    db.query.trilha.findMany({
      columns: { id: true, titulo: true },
      orderBy: { titulo: "asc" },
    }),
  ]);
  return montarAcesso(userId, pessoa, {
    catalogo: {
      cursos: cursos.map((c) => ({
        id: c.id as CursoId,
        titulo: c.titulo,
        trilhaId: (c.naTrilha?.trilhaId ?? null) as TrilhaId | null,
      })),
      trilhas: trilhas.map((t) => ({ id: t.id as TrilhaId, titulo: t.titulo })),
    },
    liberacoes,
  });
}
