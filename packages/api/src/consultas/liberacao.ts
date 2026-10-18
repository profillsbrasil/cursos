import type { Database } from "@cursos/db";
import { liberacao } from "@cursos/db/schema/index";
import { and, eq, isNull, sql } from "drizzle-orm";
import {
  acaoNaLiberacao,
  type LiberacaoNaPessoa,
  type LinhasDoAcesso,
  type ResultadoDoLote,
  type ResultadoNaPessoa,
} from "../dominio/liberacao";
import { paraCatalogo } from "../dominio/painel";
import { diaLocal } from "../dominio/sequencia";
import type {
  AdminId,
  CursoId,
  LiberacaoId,
  OrigemDaLiberacao,
  Pessoa,
} from "../dominio/tipos";
import { ErroParaAPessoa } from "../index";
import { COM_CONTEUDO } from "./catalogo";
import { type Executor, filtroLiberacaoAtiva } from "./comum";
import { mensagemDoBanco, violacaoDe } from "./erros";
import { linhasDoHistorico } from "./meus-cursos";
import { type AlunoTravado, comAlunoTravado } from "./trava";

/** Na troca o autor é o próprio aluno (liberacao_troca_pelo_aluno). */
export type NovaLiberacao =
  | { cursoId: CursoId; origem: "admin"; por: AdminId }
  | { cursoId: CursoId; origem: "troca" };

/**
 * Único INSERT em liberacao do app. Não decide nada: quem chama já decidiu com o
 * aluno travado. A violação do índice de liberação ativa sobe como está.
 */
export async function inserirLiberacao(
  aluno: AlunoTravado,
  nova: NovaLiberacao,
  agora: Date
): Promise<LiberacaoId> {
  const [linha] = await aluno.tx
    .insert(liberacao)
    .values({
      cursoId: nova.cursoId,
      liberadaEm: agora,
      liberadaPor: nova.origem === "admin" ? nova.por : aluno.userId,
      origem: nova.origem,
      userId: aluno.userId,
    })
    .returning({ id: liberacao.id });
  if (!linha) {
    throw new Error("O insert da liberação não devolveu a linha.");
  }
  return linha.id as LiberacaoId;
}

async function cursoExiste(exec: Executor, id: CursoId): Promise<boolean> {
  const c = await exec.query.curso.findFirst({
    columns: { id: true },
    where: { id },
  });
  return c !== undefined;
}

interface LiberacaoAtiva {
  liberacaoId: LiberacaoId;
  liberadaEm: Date;
  origem: OrigemDaLiberacao;
}

/** A liberação ativa do curso, de qualquer origem. O índice liberacao_curso_ativa_unica garante uma no máximo. */
async function ativaDoCurso(
  exec: Executor,
  userId: string,
  cursoId: CursoId
): Promise<LiberacaoAtiva | null> {
  const l = await exec.query.liberacao.findFirst({
    columns: { id: true, liberadaEm: true, origem: true },
    where: { ...filtroLiberacaoAtiva(userId), cursoId },
  });
  return l
    ? {
        liberacaoId: l.id as LiberacaoId,
        liberadaEm: l.liberadaEm,
        origem: l.origem,
      }
    : null;
}

const FK_DO_CURSO = "liberacao_curso_id_curso_id_fkey";

export const PESSOA_SUMIU =
  "Esta pessoa não existe mais no login da plataforma.";

const cursoSumiu = (cause?: unknown) =>
  new ErroParaAPessoa({
    cause,
    code: "NOT_FOUND",
    message: "Este curso não existe mais.",
  });

/**
 * Admin libera um curso. Com a trava do aluno, uma troca concorrente espera, lê
 * a liberação nova e devolve "já tem" sem debitar. Liberar o que já está ativo
 * devolve a liberação existente. A Pessoa vem de Pessoas.porId: só libera para
 * quem o Clerk conhece.
 */
export async function liberar(
  db: Database,
  admin: AdminId,
  pessoa: Pessoa,
  cursoId: CursoId,
  agora: Date
): Promise<LiberacaoAtiva & { nova: boolean }> {
  try {
    return await comAlunoTravado(db, pessoa.userId, async (aluno) => {
      // Em série: a transação tem um client só (consultas/aula.ts).
      if (!(await cursoExiste(aluno.tx, cursoId))) {
        throw cursoSumiu();
      }
      const existente = await ativaDoCurso(aluno.tx, aluno.userId, cursoId);
      if (existente) {
        return { ...existente, nova: false };
      }
      return {
        liberacaoId: await inserirLiberacao(
          aluno,
          { cursoId, origem: "admin", por: admin },
          agora
        ),
        liberadaEm: agora,
        nova: true,
        origem: "admin",
      };
    });
  } catch (erro) {
    // O curso foi lido antes de o DELETE dele comitar: liberar trava o aluno,
    // não o curso, e o INSERT espera a linha e para no FK.
    if (violacaoDe(erro)?.restricao === FK_DO_CURSO) {
      throw cursoSumiu(erro);
    }
    throw erro;
  }
}

const NAO_LIBEROU = "Não deu para liberar agora. Nada mudou para esta pessoa.";

function falhaNoLog(erro: unknown, userId: string): LiberacaoNaPessoa {
  if (erro instanceof ErroParaAPessoa) {
    return { mensagem: erro.message, tipo: "nao_liberou" };
  }
  const doBanco = mensagemDoBanco(erro);
  if (doBanco) {
    return { mensagem: doBanco.message, tipo: "nao_liberou" };
  }
  console.error(`liberarVarios: ${userId} não liberou`, erro);
  return { mensagem: NAO_LIBEROU, tipo: "nao_liberou" };
}

type PessoaNoClerk =
  | { pessoa: Pessoa | null; userId: string }
  | { erro: unknown; userId: string };

async function liberarNaPessoa(
  db: Database,
  admin: AdminId,
  procura: PessoaNoClerk,
  cursoId: CursoId,
  agora: Date
): Promise<LiberacaoNaPessoa> {
  if ("erro" in procura) {
    return falhaNoLog(procura.erro, procura.userId);
  }
  if (procura.pessoa === null) {
    return { mensagem: PESSOA_SUMIU, tipo: "nao_liberou" };
  }
  try {
    const r = await liberar(db, admin, procura.pessoa, cursoId, agora);
    return r.nova
      ? { tipo: "liberada_agora" }
      : {
          liberadaEm: diaLocal(r.liberadaEm),
          origem: r.origem,
          tipo: "ja_tinha",
        };
  } catch (erro) {
    return falhaNoLog(erro, procura.userId);
  }
}

export async function liberarVarios(
  db: Database,
  porId: (userId: string) => Promise<Pessoa | null>,
  admin: AdminId,
  userIds: readonly string[],
  cursoId: CursoId,
  agora: Date
): Promise<ResultadoDoLote> {
  if (!(await cursoExiste(db, cursoId))) {
    throw cursoSumiu();
  }
  const procuras = await Promise.all(
    [...new Set(userIds)].map((userId) =>
      porId(userId).then(
        (pessoa): PessoaNoClerk => ({ pessoa, userId }),
        (erro: unknown): PessoaNoClerk => ({ erro, userId })
      )
    )
  );
  const pessoas: ResultadoNaPessoa[] = [];
  for (const procura of procuras) {
    pessoas.push({
      userId: procura.userId,
      // biome-ignore lint/performance/noAwaitInLoops: uma pessoa por vez, para o lote ocupar uma conexão do pool, não todas.
      ...(await liberarNaPessoa(db, admin, procura, cursoId, agora)),
    });
  }
  return { hoje: diaLocal(agora), pessoas };
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

/**
 * Tela /admin/alunos/[userId], em 6 statements paralelos: todas as liberações da
 * pessoa com o curso (o statement 1 do painel, revogadas inclusive), o histórico
 * de estudo (os statements 2 a 5 do painel) e o catálogo.
 */
export async function linhasDoAcesso(
  db: Database,
  userId: string
): Promise<LinhasDoAcesso> {
  const [liberacoes, historico, catalogo] = await Promise.all([
    db.query.liberacao.findMany({
      columns: {
        id: true,
        liberadaEm: true,
        origem: true,
        revogadaEm: true,
      },
      where: { userId },
      with: { curso: COM_CONTEUDO },
    }),
    linhasDoHistorico(db, userId),
    db.query.curso.findMany({
      columns: { id: true, status: true, titulo: true },
      orderBy: { titulo: "asc" },
    }),
  ]);
  return {
    catalogo: catalogo.map((c) => ({ ...c, id: c.id as CursoId })),
    historico,
    liberacoes: liberacoes.map((l) => ({
      curso: paraCatalogo(l.curso),
      id: l.id as LiberacaoId,
      liberadaEm: l.liberadaEm,
      origem: l.origem,
      revogadaEm: l.revogadaEm,
    })),
  };
}
