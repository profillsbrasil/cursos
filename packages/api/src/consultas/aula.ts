import type { Database } from "@cursos/db";
import {
  aulaAssistida,
  certificado,
  cotaVideo,
  pontoLancamento,
  posicaoAula,
} from "@cursos/db/schema/index";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import {
  type AulaNoPlayer,
  aulaPorId,
  type EntradaDoCurso,
  entradaDoCurso,
  estudoDaAula,
  type LinhasCurso,
  montarAulaNoPlayer,
  montarCursoAberto,
} from "../dominio/aula";
import {
  aplicarRegistro,
  conquistaDe,
  lancamentosDaAssistida,
  type Pedido,
  type Registro,
} from "../dominio/registro";
import { COTA_VIDEO } from "../dominio/regras";
import type { AulaId, DiaISO } from "../dominio/tipos";
import { cobertura } from "../dominio/trechos";
import { COM_CONTEUDO } from "./catalogo";

type Transacao = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Executor = Database | Transacao;

/** Como achar o curso: pela URL (slug) ou pelo registro (aula). */
export type ChaveCurso = { aulaId: string } | { slug: string };

const ativasDo = (userId: string) =>
  ({
    columns: { id: true },
    where: { revogadaEm: { isNull: true }, userId },
  }) as const;

/**
 * 4 statements, sem prepare nomeado (pooler 6543). Só o primeiro depende da chave;
 * os outros filtram por user_id. As posições saem num select comum porque a
 * relational query não passa int4multirange pelo fromDriver.
 */
export async function linhasDoCurso(
  exec: Executor,
  userId: string,
  chave: ChaveCurso
): Promise<LinhasCurso> {
  const consultas = [
    exec.query.curso.findFirst({
      ...COM_CONTEUDO,
      where:
        "slug" in chave
          ? { slug: chave.slug }
          : { modulos: { aulas: { id: chave.aulaId } } },
      with: {
        ...COM_CONTEUDO.with,
        liberacoes: ativasDo(userId),
        naTrilha: {
          columns: {},
          with: {
            trilha: {
              columns: { descricao: true, id: true, slug: true, titulo: true },
              with: {
                cursos: {
                  columns: { posicao: true },
                  with: { curso: COM_CONTEUDO },
                },
                liberacoes: ativasDo(userId),
              },
            },
          },
        },
      },
    }),
    exec
      .select({
        codigo: certificado.codigo,
        cursoId: certificado.cursoId,
        emitidoEm: certificado.emitidoEm,
      })
      .from(certificado)
      .where(eq(certificado.userId, userId)),
    exec
      .select({
        assistidaEm: aulaAssistida.assistidaEm,
        aulaId: aulaAssistida.aulaId,
        dia: aulaAssistida.dia,
      })
      .from(aulaAssistida)
      .where(eq(aulaAssistida.userId, userId)),
    exec
      .select({
        atualizadaEm: posicaoAula.atualizadaEm,
        aulaId: posicaoAula.aulaId,
        posicaoSeg: posicaoAula.posicaoSeg,
        trechosVistos: posicaoAula.trechosVistos,
      })
      .from(posicaoAula)
      .where(eq(posicaoAula.userId, userId)),
  ] as const;
  // Numa transação os quatro dividem um client, e o pg 8 avisa que query
  // concorrente no mesmo client deixa de funcionar no pg 9.
  const [curso, certificados, assistidas, posicoes] =
    "rollback" in exec
      ? ([
          await consultas[0],
          await consultas[1],
          await consultas[2],
          await consultas[3],
        ] as const)
      : await Promise.all(consultas);
  return { assistidas, certificados, curso: curso ?? null, posicoes };
}

export async function carregarAula(
  db: Database,
  userId: string,
  slug: string,
  aulaId: string
): Promise<AulaNoPlayer | null> {
  const aberto = montarCursoAberto(await linhasDoCurso(db, userId, { slug }));
  const aula = aberto && aulaPorId(aberto, aulaId);
  return aberto && aula ? montarAulaNoPlayer(aberto, aula) : null;
}

export async function carregarEntrada(
  db: Database,
  userId: string,
  slug: string
): Promise<EntradaDoCurso | null> {
  const aberto = montarCursoAberto(await linhasDoCurso(db, userId, { slug }));
  return aberto && entradaDoCurso(aberto);
}

const erroSemAcesso = () =>
  new TRPCError({ code: "NOT_FOUND", message: "Aula não encontrada." });

const erroSemVideo = () =>
  new TRPCError({
    code: "PRECONDITION_FAILED",
    message: "O vídeo desta aula ainda não foi publicado.",
  });

/**
 * Uma transação: trava a cota do aluno, relê o acesso, aplica o registro, grava
 * posição, trechos e cota e, só na virada, a aula assistida e os lançamentos.
 * Qualquer erro desfaz tudo; reenviar o mesmo pedido dá o mesmo resultado.
 */
export function registrar(
  db: Database,
  userId: string,
  aulaId: AulaId,
  pedido: Pedido,
  agora: Date
): Promise<Registro> {
  return db.transaction(async (tx) => {
    // O DO UPDATE trava a linha do aluno até o fim da transação; aluno novo nasce com o balde cheio.
    const [cota] = await tx
      .insert(cotaVideo)
      .values({ atualizadaEm: agora, segundos: COTA_VIDEO.tetoSeg, userId })
      .onConflictDoUpdate({
        set: { userId },
        target: cotaVideo.userId,
      })
      .returning({
        atualizadaEm: cotaVideo.atualizadaEm,
        segundos: cotaVideo.segundos,
      });
    const aberto = montarCursoAberto(
      await linhasDoCurso(tx, userId, { aulaId })
    );
    const aula = aberto && aulaPorId(aberto, aulaId);
    if (!(aberto && aula)) {
      throw erroSemAcesso();
    }
    if (!aula.video) {
      throw erroSemVideo();
    }
    const salvo = estudoDaAula(aberto, aula);
    const r = aplicarRegistro(
      { ...salvo, duracaoSeg: aula.duracaoSeg },
      cota ?? null,
      pedido,
      agora
    );
    await tx
      .insert(posicaoAula)
      .values({
        atualizadaEm: agora,
        aulaId,
        posicaoSeg: r.posicaoSeg,
        trechosVistos: r.trechos,
        userId,
      })
      .onConflictDoUpdate({
        set: {
          atualizadaEm: agora,
          posicaoSeg: r.posicaoSeg,
          trechosVistos: r.trechos,
        },
        target: [posicaoAula.userId, posicaoAula.aulaId],
      });
    await tx
      .update(cotaVideo)
      .set({ atualizadaEm: agora, segundos: r.cota.segundos })
      .where(eq(cotaVideo.userId, userId));

    let conquista: Registro["conquista"] = null;
    if (r.viraAssistida) {
      const [fato] = await tx
        .insert(aulaAssistida)
        .values({ assistidaEm: agora, aulaId, userId })
        .onConflictDoNothing()
        .returning({ dia: aulaAssistida.dia });
      if (fato) {
        const efeitos = lancamentosDaAssistida(
          aulaId,
          fato.dia as DiaISO,
          aberto.dias
        );
        await tx
          .insert(pontoLancamento)
          .values(
            efeitos.lancamentos.map((l) => ({
              ...l,
              criadoEm: agora,
              userId,
            }))
          )
          .onConflictDoNothing();
        conquista = conquistaDe(efeitos);
      }
    }
    return {
      assistida: salvo.assistida || r.viraAssistida,
      cobertura: cobertura(r.trechos, aula.duracaoSeg),
      conquista,
      recusadosSeg: r.recusadosSeg,
      trechos: r.trechos,
    };
  });
}
