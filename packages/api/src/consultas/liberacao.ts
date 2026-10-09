import type { Database } from "@cursos/db";
import { liberacao } from "@cursos/db/schema/index";
import { and, eq, isNull, sql } from "drizzle-orm";
import {
  type Alvo,
  acaoNaLiberacao,
  decidirLiberar,
  type LiberacaoAtiva,
  type LinhasDoAcesso,
  type PedidoDeLiberar,
} from "../dominio/liberacao";
import type {
  AdminId,
  CursoId,
  LiberacaoId,
  Pessoa,
  TrilhaId,
} from "../dominio/tipos";
import { ErroParaAPessoa } from "../index";
import { type Executor, filtroLiberacaoAtiva } from "./comum";
import { violacaoDe } from "./erros";
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

function alvoDa(l: {
  cursoId: string | null;
  id: string;
  trilhaId: string | null;
}): Alvo {
  if (l.cursoId) {
    return { id: l.cursoId as CursoId, tipo: "curso" };
  }
  if (l.trilhaId) {
    return { id: l.trilhaId as TrilhaId, tipo: "trilha" };
  }
  throw new Error(`Liberação ${l.id} sem alvo.`);
}

/** null: o alvo não existe. Os cursos da trilha, ou vazio para curso. */
async function cursosDoAlvo(
  exec: Executor,
  alvo: Alvo
): Promise<CursoId[] | null> {
  const where = { id: alvo.id };
  if (alvo.tipo === "curso") {
    const c = await exec.query.curso.findFirst({
      columns: { id: true },
      where,
    });
    return c ? [] : null;
  }
  const t = await exec.query.trilha.findFirst({
    columns: { id: true },
    where,
    with: { cursos: { columns: { cursoId: true } } },
  });
  return t ? t.cursos.map((c) => c.cursoId as CursoId) : null;
}

async function liberacoesAtivas(
  exec: Executor,
  userId: string
): Promise<LiberacaoAtiva[]> {
  const linhas = await exec.query.liberacao.findMany({
    columns: { cursoId: true, id: true, origem: true, trilhaId: true },
    where: filtroLiberacaoAtiva(userId),
  });
  return linhas.map((l) => ({
    alvo: alvoDa(l),
    id: l.id as LiberacaoId,
    origem: l.origem,
  }));
}

const FK_DO_ALVO = new Set([
  "liberacao_curso_id_curso_id_fkey",
  "liberacao_trilha_id_trilha_id_fkey",
]);

/**
 * Admin libera trilha ou curso. Com a trava do aluno, uma troca concorrente
 * espera, lê a liberação nova e devolve "já tem" sem debitar. Liberar o que já
 * está ativo devolve a liberação existente. A Pessoa vem de Pessoas.porId: só
 * libera para quem o Clerk conhece.
 */
export async function liberar(
  db: Database,
  admin: AdminId,
  pessoa: Pessoa,
  pedido: PedidoDeLiberar,
  agora: Date
): Promise<{ liberacaoId: LiberacaoId; nova: boolean }> {
  const sumiu = (cause?: unknown) =>
    new ErroParaAPessoa({
      cause,
      code: "NOT_FOUND",
      message:
        pedido.tipo === "curso"
          ? "Este curso não existe mais."
          : "Esta trilha não existe mais.",
    });
  try {
    return await comAlunoTravado(db, pessoa.userId, async (aluno) => {
      // Em série: a transação tem um client só (consultas/aula.ts).
      const cursosDaTrilha = await cursosDoAlvo(aluno.tx, pedido);
      if (!cursosDaTrilha) {
        throw sumiu();
      }
      const d = decidirLiberar(
        await liberacoesAtivas(aluno.tx, aluno.userId),
        pedido,
        cursosDaTrilha
      );
      switch (d.tipo) {
        case "trocados_mudaram":
          throw new ErroParaAPessoa({
            code: "CONFLICT",
            message: `Os cursos que ${pessoa.nome} trocou por pontos nesta trilha mudaram desde que a tela abriu. Confira o aviso e libere de novo.`,
          });
        case "ja_liberada":
          return { liberacaoId: d.liberacaoId, nova: false };
        case "inserir":
          return {
            liberacaoId: await inserirLiberacao(
              aluno,
              { alvo: pedido, origem: "admin", por: admin },
              agora
            ),
            nova: true,
          };
        default:
          return d satisfies never;
      }
    });
  } catch (erro) {
    // O alvo foi lido antes de o DELETE do curso ou da trilha comitar: liberar
    // trava o aluno, não o alvo, e o INSERT espera a linha e para no FK.
    const restricao = violacaoDe(erro)?.restricao;
    if (restricao !== undefined && FK_DO_ALVO.has(restricao)) {
      throw sumiu(erro);
    }
    throw erro;
  }
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
    throw new ErroParaAPessoa({
      code: "NOT_FOUND",
      message: "Esta liberação não existe.",
    });
  }
  return comAlunoTravado(db, dono.userId, async (aluno) => {
    const linha = await aluno.tx.query.liberacao.findFirst({
      columns: { origem: true, revogadaEm: true },
      where: { id: liberacaoId },
    });
    if (!linha) {
      throw new Error(`Liberação ${liberacaoId} sumiu com o aluno travado.`);
    }
    const acao = acaoNaLiberacao(linha);
    switch (acao.tipo) {
      case "fixa_por_troca":
        throw new ErroParaAPessoa({
          code: "PRECONDITION_FAILED",
          message:
            "Liberação de troca não se revoga. O aluno pagou por ela com pontos.",
        });
      case "revogada":
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
        return acao satisfies never;
    }
  });
}

/** Tela /admin/alunos/[userId]: todas as liberações da pessoa e o catálogo, em paralelo. */
export async function linhasDoAcesso(
  db: Database,
  userId: string
): Promise<LinhasDoAcesso> {
  const [liberacoes, cursos, trilhas] = await Promise.all([
    db.query.liberacao.findMany({
      columns: {
        cursoId: true,
        id: true,
        liberadaEm: true,
        origem: true,
        revogadaEm: true,
        trilhaId: true,
      },
      where: { userId },
      with: {
        curso: { columns: { titulo: true } },
        trilha: { columns: { titulo: true } },
      },
    }),
    db.query.curso.findMany({
      columns: { id: true, status: true, titulo: true },
      orderBy: { titulo: "asc" },
      with: { naTrilha: { columns: { trilhaId: true } } },
    }),
    db.query.trilha.findMany({
      columns: { id: true, titulo: true },
      orderBy: { titulo: "asc" },
    }),
  ]);
  return {
    catalogo: {
      cursos: cursos.map((c) => ({
        id: c.id as CursoId,
        status: c.status,
        titulo: c.titulo,
        trilhaId: (c.naTrilha?.trilhaId ?? null) as TrilhaId | null,
      })),
      trilhas: trilhas.map((t) => ({ id: t.id as TrilhaId, titulo: t.titulo })),
    },
    liberacoes: liberacoes.map((l) => {
      const titulo = l.curso?.titulo ?? l.trilha?.titulo;
      if (titulo === undefined) {
        throw new Error(`Liberação ${l.id} sem o título do alvo.`);
      }
      return {
        alvo: { ...alvoDa(l), titulo },
        id: l.id as LiberacaoId,
        liberadaEm: l.liberadaEm,
        origem: l.origem,
        revogadaEm: l.revogadaEm,
      };
    }),
  };
}
