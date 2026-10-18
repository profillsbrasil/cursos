import {
  aula,
  aulaAssistida,
  certificado,
  curso,
  liberacao,
  modulo,
  pergunta,
  pontoLancamento,
} from "@cursos/db/schema/index";
import { and, eq, isNull, sql } from "drizzle-orm";

import { gerarCodigo } from "../dominio/certificado";
import { type CursoComAulas, lerCursoDoAluno } from "../dominio/curso-do-aluno";
import { estudoDe } from "../dominio/historico";
import { PONTOS } from "../dominio/regras";
import type { AulaId, CursoId } from "../dominio/tipos";
import type { Transacao } from "./comum";
import { linhasDoHistoricoNoCurso } from "./meus-cursos";
import { type AlunoTravado, travarAluno } from "./trava";

/** Colidir duas vezes em 31^8 códigos é defeito, não azar. */
const SORTEIOS = 5;

export interface Conclusao {
  codigo: string;
}

interface CursoParaConcluir extends CursoComAulas {
  segundosDeVideo: number;
}

/** Um statement: o curso com os módulos, as aulas e as perguntas contadas. null sem o curso. */
async function cursoParaConcluir(
  tx: Transacao,
  cursoId: CursoId
): Promise<CursoParaConcluir | null> {
  const linhas = await tx
    .select({
      aulaId: aula.id,
      duracaoSeg: aula.duracaoSeg,
      moduloId: modulo.id,
      numero: modulo.numero,
      perguntas: sql<
        number | null
      >`(select count(*)::int from ${pergunta} where ${pergunta.aulaId} = ${aula.id})`,
      status: curso.status,
      titulo: curso.titulo,
      tituloDoModulo: modulo.titulo,
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
  const modulos = new Map<
    string,
    {
      aulas: { id: AulaId; perguntas: number }[];
      numero: number;
      titulo: string;
    }
  >();
  for (const l of linhas) {
    if (l.moduloId === null || l.numero === null || l.tituloDoModulo === null) {
      continue;
    }
    const m = modulos.get(l.moduloId) ?? {
      aulas: [],
      numero: l.numero,
      titulo: l.tituloDoModulo,
    };
    modulos.set(l.moduloId, m);
    if (l.aulaId !== null) {
      m.aulas.push({ id: l.aulaId as AulaId, perguntas: l.perguntas ?? 0 });
    }
  }
  return {
    id: cursoId,
    modulos: [...modulos.values()],
    segundosDeVideo: linhas.reduce((s, l) => s + (l.duracaoSeg ?? 0), 0),
    status: primeira.status,
    titulo: primeira.titulo,
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
  if (!(alvo && (await temLiberacaoAtiva(aluno, cursoId)))) {
    return null;
  }
  const linhas = await linhasDoHistoricoNoCurso(aluno, {
    aulas: alvo.modulos.flatMap((m) => m.aulas.map((a) => a.id)),
    cursoId,
  });
  const { completo, estado } = lerCursoDoAluno(alvo, estudoDe(linhas));
  if (estado.tipo === "concluido" || !completo) {
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
