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
  abreAAula,
  aulaPorId,
  type CursoAberto,
  estudoDaAula,
  type LinhasCurso,
  montarAulaNoPlayer,
  montarCursoVisto,
} from "../dominio/aula";
import {
  montarPaginaDoCurso,
  type PaginaDoCurso,
} from "../dominio/pagina-do-curso";
import type { Aluno } from "../dominio/perfil";
import {
  aplicarRegistro,
  conquistaDe,
  lancamentosDaAssistida,
  type Pedido,
  type Registro,
} from "../dominio/registro";
import { COTA_VIDEO, PONTOS } from "../dominio/regras";
import type { AulaId, CursoId, DiaISO } from "../dominio/tipos";
import { cobertura } from "../dominio/trechos";
import { ErroParaAPessoa } from "../index";
import { COM_CONTEUDO } from "./catalogo";
import { concluirCurso } from "./certificado";
import { type Executor, relacoesDoAcesso } from "./comum";
import { materiaisDaPagina } from "./material";
import { linhasDosQuestionarios } from "./meus-cursos";
import { saldoDe } from "./pontos";
import { linhasDoQuestionario } from "./questionario";
import { type AlunoTravado, travarAluno } from "./trava";

export type ChaveCurso = { aulaId: string } | { slug: string };

/**
 * `serial` é para dentro de uma transação: os cinco dividem um client, e o pg 8
 * avisa que query concorrente no mesmo client deixa de funcionar no pg 9.
 */
export async function linhasDoCurso(
  exec: Executor,
  aluno: Aluno,
  chave: ChaveCurso,
  { serial }: { serial: boolean }
): Promise<LinhasCurso> {
  const { userId } = aluno;
  const consultas = [
    exec.query.curso.findFirst({
      ...COM_CONTEUDO,
      columns: { ...COM_CONTEUDO.columns, precoTroca: true },
      where:
        "slug" in chave
          ? { slug: chave.slug }
          : { modulos: { aulas: { id: chave.aulaId } } },
      with: {
        ...COM_CONTEUDO.with,
        ...relacoesDoAcesso(aluno),
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
    linhasDosQuestionarios(exec, userId),
  ] as const;
  const [curso, certificados, assistidas, posicoes, questionarios] = serial
    ? ([
        await consultas[0],
        await consultas[1],
        await consultas[2],
        await consultas[3],
        await consultas[4],
      ] as const)
    : await Promise.all(consultas);
  return {
    assistidas,
    certificados,
    curso: curso ?? null,
    posicoes,
    questionarios,
  };
}

export async function carregarAula(
  db: Database,
  aluno: Aluno,
  slug: string,
  aulaId: string
): Promise<AulaNoPlayer | null> {
  const [linhas, questionario] = await Promise.all([
    linhasDoCurso(db, aluno, { slug }, { serial: false }),
    linhasDoQuestionario(db, aluno.userId, aulaId as AulaId),
  ]);
  const aberto = montarCursoVisto(linhas);
  const aula = aberto && abreAAula(aberto, aulaId) && aulaPorId(aberto, aulaId);
  if (!(aberto && aula)) {
    return null;
  }
  return montarAulaNoPlayer(
    aberto,
    aula,
    questionario,
    await saldoDaAmostra(db, aluno, aberto)
  );
}

/** O saldo só entra na amostra, para a troca; o curso inteiro não o lê. */
const saldoDaAmostra = (db: Database, aluno: Aluno, c: CursoAberto) =>
  c.amostra ? saldoDe(db, aluno.userId) : Promise.resolve(0);

export async function carregarPaginaDoCurso(
  db: Database,
  aluno: Aluno,
  slug: string
): Promise<PaginaDoCurso | null> {
  const [linhas, materiais] = await Promise.all([
    linhasDoCurso(db, aluno, { slug }, { serial: false }),
    materiaisDaPagina(db, slug),
  ]);
  const aberto = montarCursoVisto(linhas);
  if (!aberto) {
    return null;
  }
  // A amostra não lista o material de apoio: o download também a recusa.
  return montarPaginaDoCurso(
    aberto,
    aberto.amostra ? [] : materiais,
    await saldoDaAmostra(db, aluno, aberto)
  );
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
 * Na troca, com o aluno travado: o lançamento aula_assistida de cada aula do
 * curso que a pessoa já assistiu na amostra. O unique ponto_aula_uma_vez segura
 * a aula que já tinha o dela. Só o lançamento da aula: a sequência não entra.
 */
export async function lancarAulasAssistidas(
  aluno: AlunoTravado,
  cursoId: CursoId,
  agora: Date
): Promise<void> {
  await aluno.tx.execute(sql`
    insert into ${pontoLancamento} (user_id, motivo, aula_id, pontos, criado_em)
    select aa.user_id, 'aula_assistida', aa.aula_id, ${PONTOS.aula_assistida}, ${agora}
      from ${aulaAssistida} aa
      join aula a on a.id = aa.aula_id
      join modulo m on m.id = a.modulo_id
     where aa.user_id = ${aluno.userId}
       and m.curso_id = ${cursoId}
    on conflict do nothing`);
}

/**
 * Uma transação: trava a cota do aluno, relê o acesso, aplica o registro, grava
 * posição, trechos e cota e, só na virada, a aula assistida, os lançamentos e,
 * com a trava do aluno, a conclusão do curso que essa aula fechou.
 * Qualquer erro desfaz tudo; reenviar o mesmo pedido dá o mesmo resultado.
 */
export function registrar(
  db: Database,
  aluno: Aluno,
  aulaId: AulaId,
  pedido: Pedido,
  agora: Date
): Promise<Registro> {
  const { userId } = aluno;
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
    const aberto = montarCursoVisto(
      await linhasDoCurso(tx, aluno, { aulaId }, { serial: true })
    );
    const aula =
      aberto && abreAAula(aberto, aulaId) && aulaPorId(aberto, aulaId);
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
      // A amostra grava o fato e não lança: os pontos dela entram na troca
      // (lancarAulasAssistidas), e o curso não conclui sem ela.
      if (fato && !aberto.amostra) {
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
        await concluirCurso(
          await travarAluno(tx, userId),
          aberto.curso.id as CursoId,
          agora
        );
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
