import {
  aula,
  aulaAssistida,
  certificado,
  curso,
  liberacao,
  modulo,
  pergunta,
  pontoLancamento,
  questionarioTentativa,
} from "@cursos/db/schema/index";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { gerarCodigo } from "../dominio/certificado";
import { type CursoComAulas, cursoCompleto } from "../dominio/curso";
import { PONTOS } from "../dominio/regras";
import type { AulaId, CursoId, Historico } from "../dominio/tipos";
import type { Transacao } from "./comum";
import { type AlunoTravado, travarAluno } from "./trava";

/** Colidir duas vezes em 31^8 códigos é defeito, não azar. */
const SORTEIOS = 5;

export interface Conclusao {
  codigo: string;
}

interface CursoParaConcluir extends CursoComAulas {
  segundosDeVideo: number;
}

/** Um statement: o curso com as aulas e as perguntas contadas. null sem o curso. */
async function cursoParaConcluir(
  tx: Transacao,
  cursoId: CursoId
): Promise<CursoParaConcluir | null> {
  const linhas = await tx
    .select({
      aulaId: aula.id,
      duracaoSeg: aula.duracaoSeg,
      perguntas: sql<
        number | null
      >`(select count(*)::int from ${pergunta} where ${pergunta.aulaId} = ${aula.id})`,
      status: curso.status,
      titulo: curso.titulo,
    })
    .from(curso)
    .leftJoin(modulo, eq(modulo.cursoId, curso.id))
    .leftJoin(aula, eq(aula.moduloId, modulo.id))
    .where(eq(curso.id, cursoId))
    .orderBy(modulo.numero, aula.posicao);
  const [primeira] = linhas;
  if (!primeira) {
    return null;
  }
  return {
    id: cursoId,
    modulos: [
      {
        aulas: linhas.flatMap((l) =>
          l.aulaId === null
            ? []
            : [{ id: l.aulaId as AulaId, perguntas: l.perguntas ?? 0 }]
        ),
      },
    ],
    segundosDeVideo: linhas.reduce((s, l) => s + (l.duracaoSeg ?? 0), 0),
    status: primeira.status,
    titulo: primeira.titulo,
  };
}

async function historicoNoCurso(
  aluno: AlunoTravado,
  aulas: readonly AulaId[]
): Promise<Pick<Historico, "assistidas" | "questionarios">> {
  if (aulas.length === 0) {
    return { assistidas: new Set(), questionarios: new Map() };
  }
  const ids = [...aulas];
  const assistidas = await aluno.tx
    .select({ aulaId: aulaAssistida.aulaId })
    .from(aulaAssistida)
    .where(
      and(
        eq(aulaAssistida.userId, aluno.userId),
        inArray(aulaAssistida.aulaId, ids)
      )
    );
  const aprovadas = await aluno.tx
    .select({
      acertos: questionarioTentativa.acertos,
      aulaId: questionarioTentativa.aulaId,
      total: questionarioTentativa.total,
    })
    .from(questionarioTentativa)
    .where(
      and(
        eq(questionarioTentativa.userId, aluno.userId),
        eq(questionarioTentativa.aprovada, true),
        inArray(questionarioTentativa.aulaId, ids)
      )
    );
  return {
    assistidas: new Set(assistidas.map((a) => a.aulaId as AulaId)),
    questionarios: new Map(
      aprovadas.map((q) => [
        q.aulaId as AulaId,
        {
          aprovada: true,
          tentativas: 1,
          ultima: { acertos: q.acertos, total: q.total },
        },
      ])
    ),
  };
}

async function temLiberacaoAtiva(aluno: AlunoTravado, cursoId: CursoId) {
  const [ativa] = await aluno.tx
    .select({ id: liberacao.id })
    .from(liberacao)
    .where(
      and(
        eq(liberacao.userId, aluno.userId),
        eq(liberacao.cursoId, cursoId),
        isNull(liberacao.revogadaEm)
      )
    );
  return ativa !== undefined;
}

async function jaTemCertificado(aluno: AlunoTravado, cursoId: CursoId) {
  const [c] = await aluno.tx
    .select({ codigo: certificado.codigo })
    .from(certificado)
    .where(
      and(
        eq(certificado.userId, aluno.userId),
        eq(certificado.cursoId, cursoId)
      )
    );
  return c !== undefined;
}

/**
 * O código só colide com o unique: on conflict (codigo) do nothing não devolve
 * linha, e o sorteio repete. O unique de um por curso ainda sobe, e não deve
 * disparar: quem chama leu que não há certificado com o aluno travado.
 */
async function gravarCertificado(
  aluno: AlunoTravado,
  alvo: CursoParaConcluir,
  agora: Date
): Promise<string> {
  for (let i = 0; i < SORTEIOS; i += 1) {
    const codigo = gerarCodigo();
    // biome-ignore lint/performance/noAwaitInLoops: cada sorteio depende de o anterior ter colidido.
    const [gravado] = await aluno.tx
      .insert(certificado)
      .values({
        codigo,
        cursoId: alvo.id,
        emitidoEm: agora,
        segundosDeVideo: alvo.segundosDeVideo,
        userId: aluno.userId,
      })
      .onConflictDoNothing({ target: certificado.codigo })
      .returning({ codigo: certificado.codigo });
    if (gravado) {
      return gravado.codigo;
    }
  }
  throw new Error(
    `O código do certificado colidiu ${SORTEIOS} vezes seguidas.`
  );
}

/**
 * O certificado e os pontos de curso concluído, quando a pessoa assistiu a todas
 * as aulas e foi aprovada em todo questionário. Lê o estado atual com o aluno
 * travado, então rodar duas vezes, ou de dois caminhos, emite uma vez. null: nada
 * a emitir agora.
 */
export async function concluirCurso(
  aluno: AlunoTravado,
  cursoId: CursoId,
  agora: Date
): Promise<Conclusao | null> {
  const alvo = await cursoParaConcluir(aluno.tx, cursoId);
  if (!alvo || alvo.status === "em_producao") {
    return null;
  }
  if (!(await temLiberacaoAtiva(aluno, cursoId))) {
    return null;
  }
  if (await jaTemCertificado(aluno, cursoId)) {
    return null;
  }
  const aulas = alvo.modulos.flatMap((m) => m.aulas.map((a) => a.id));
  const estudo = await historicoNoCurso(aluno, aulas);
  const historico: Historico = {
    ...estudo,
    certificados: new Map(),
    posicoes: new Map(),
  };
  if (!cursoCompleto(alvo, historico)) {
    return null;
  }
  const codigo = await gravarCertificado(aluno, alvo, agora);
  await aluno.tx
    .insert(pontoLancamento)
    .values({
      criadoEm: agora,
      cursoId,
      motivo: "curso_concluido",
      pontos: PONTOS.curso_concluido,
      userId: aluno.userId,
    })
    .onConflictDoNothing();
  return { codigo };
}

/**
 * Depois de uma edição que tira aula ou pergunta: quem já tinha assistido a todas
 * as aulas que ficaram pode ter completado o curso sem escrever nada.
 */
export async function concluirParaQuemCompletou(
  tx: Transacao,
  cursoId: CursoId,
  agora: Date
): Promise<void> {
  const { rows } = await tx.execute<{ user_id: string }>(sql`
    with aulas as (
      select ${aula.id} as id from ${aula}
        join ${modulo} on ${modulo.id} = ${aula.moduloId}
       where ${modulo.cursoId} = ${cursoId}
    )
    select l.user_id
      from ${liberacao} l
     where l.curso_id = ${cursoId}
       and l.revogada_em is null
       and not exists (
         select 1 from ${certificado} c
          where c.user_id = l.user_id and c.curso_id = ${cursoId})
       and (select count(*) from aulas) > 0
       and (select count(*) from ${aulaAssistida} aa
             where aa.user_id = l.user_id and aa.aula_id in (select id from aulas))
           = (select count(*) from aulas)`);
  for (const { user_id } of rows) {
    // biome-ignore lint/performance/noAwaitInLoops: as travas dividem a transação, um client só.
    await concluirCurso(await travarAluno(tx, user_id), cursoId, agora);
  }
}
