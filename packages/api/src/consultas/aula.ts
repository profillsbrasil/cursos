import type { Database } from "@cursos/db";
import {
  aulaAssistida,
  certificado,
  cotaVideo,
  pontoLancamento,
  posicaoAula,
} from "@cursos/db/schema/index";
import { eq, sql } from "drizzle-orm";
import {
  type AulaNoPlayer,
  aulaPorId,
  estudoDaAula,
  type LinhasCurso,
  montarAulaNoPlayer,
  montarCursoAberto,
} from "../dominio/aula";
import {
  montarPaginaDoCurso,
  type PaginaDoCurso,
} from "../dominio/pagina-do-curso";
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
import { ErroParaAPessoa } from "../index";
import { COM_CONTEUDO } from "./catalogo";
import { type Executor, relacaoLiberacoesAtivas } from "./comum";

export type ChaveCurso = { aulaId: string } | { slug: string };

/**
 * `serial` é para dentro de uma transação: os quatro dividem um client, e o pg 8
 * avisa que query concorrente no mesmo client deixa de funcionar no pg 9.
 */
export async function linhasDoCurso(
  exec: Executor,
  userId: string,
  chave: ChaveCurso,
  { serial }: { serial: boolean }
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
        liberacoes: relacaoLiberacoesAtivas(userId),
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
  const [curso, certificados, assistidas, posicoes] = serial
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
  const aberto = montarCursoAberto(
    await linhasDoCurso(db, userId, { slug }, { serial: false })
  );
  const aula = aberto && aulaPorId(aberto, aulaId);
  return aberto && aula ? montarAulaNoPlayer(aberto, aula) : null;
}

/** curso.pagina: null quando montarCursoAberto recusa, a mesma porta do player. */
export async function carregarPaginaDoCurso(
  db: Database,
  userId: string,
  slug: string
): Promise<PaginaDoCurso | null> {
  const aberto = montarCursoAberto(
    await linhasDoCurso(db, userId, { slug }, { serial: false })
  );
  return aberto && montarPaginaDoCurso(aberto);
}

const erroSemAcesso = () =>
  new ErroParaAPessoa({ code: "NOT_FOUND", message: "Aula não encontrada." });

const erroSemVideo = () =>
  new ErroParaAPessoa({
    code: "PRECONDITION_FAILED",
    message: "O vídeo desta aula ainda não foi publicado.",
  });

/**
 * O lock_timeout do registrar: quanto ele espera pela linha do aluno em
 * cota_video antes de o Postgres desistir (55P03, que o router devolve como
 * TOO_MANY_REQUESTS). O envio de saída sai milissegundos depois de outro
 * (visibilitychange, depois pagehide) e o player não o repete, então ele precisa
 * esperar um ou dois envios em voo terminarem. O lock_timeout vale para cada
 * tentativa de trava, não para a soma: atrás de dois em voo, ele espera a trava
 * de tupla (que o segundo segura enquanto espera o primeiro) e depois a
 * transação do segundo, cada espera com 3 s próprios. Então ele passa enquanto
 * cada envio em voo segurar a linha por menos de 3 s. Cada um segura a linha por
 * 8 a 10 idas ao banco: cabe enquanto a ida e volta entre o servidor e o banco
 * ficar abaixo de 300 ms.
 */
export const ESPERA_PELA_COTA_MS = 3000;

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
    // set_config(..., true) é o SET LOCAL: vale só até o fim desta transação.
    await tx.execute(
      sql`select set_config('lock_timeout', ${`${ESPERA_PELA_COTA_MS}ms`}, true)`
    );
    // O DO UPDATE trava a linha do aluno até o fim da transação.
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
    if (!cota) {
      throw new Error("O upsert da cota não devolveu a linha.");
    }
    const aberto = montarCursoAberto(
      await linhasDoCurso(tx, userId, { aulaId }, { serial: true })
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
      cota,
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
    await tx.update(cotaVideo).set(r.cota).where(eq(cotaVideo.userId, userId));

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
          aberto.diasComAulaAssistida
        );
        const gravados = await tx
          .insert(pontoLancamento)
          .values(
            efeitos.lancamentos.map((l) => ({
              ...l,
              criadoEm: agora,
              userId,
            }))
          )
          .onConflictDoNothing()
          .returning({
            motivo: pontoLancamento.motivo,
            pontos: pontoLancamento.pontos,
          });
        conquista = conquistaDe(gravados, efeitos.sequenciaDias);
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
