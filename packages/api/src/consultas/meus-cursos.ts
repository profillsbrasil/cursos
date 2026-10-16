import type { Database } from "@cursos/db";
import {
  aulaAssistida,
  certificado,
  comunicado,
  posicaoAula,
  questionarioTentativa,
} from "@cursos/db/schema/index";
import { and, eq, gt, sql } from "drizzle-orm";

import type {
  LinhaDoQuestionario,
  LinhasHistorico,
} from "../dominio/historico";
import {
  montarPainel,
  montarResumo,
  type PainelMeusCursos,
  type ResumoAluno,
} from "../dominio/painel";
import { diaLocal, segundaDaSemana } from "../dominio/sequencia";
import type { DiaISO } from "../dominio/tipos";
import { COM_CONTEUDO } from "./catalogo";
import { type Executor, filtroLiberacaoAtiva } from "./comum";
import { comunicadoVisivelPara, DO_MAIS_NOVO } from "./comunicado";
import { linhasDoSaldo } from "./pontos";

/**
 * As tentativas da pessoa somadas por aula: se aprovou, quantas foram, quando foi
 * a última e a nota dela. Uma linha por aula tentada.
 */
export function linhasDosQuestionarios(
  exec: Executor,
  userId: string
): Promise<LinhaDoQuestionario[]> {
  const t = questionarioTentativa;
  return exec
    .select({
      aprovada: sql<boolean>`bool_or(${t.aprovada})`,
      aulaId: t.aulaId,
      tentativas: sql<number>`count(*)::int`,
      // O decodificador da coluna devolve Date; o sql cru devolveria texto.
      ultimaEm: sql`max(${t.enviadaEm})`.mapWith(t.enviadaEm),
      ultimosAcertos: sql<number>`(array_agg(${t.acertos} order by ${t.numero} desc))[1]`,
      ultimoTotal: sql<number>`(array_agg(${t.total} order by ${t.numero} desc))[1]`,
    })
    .from(t)
    .where(eq(t.userId, userId))
    .groupBy(t.aulaId);
}

/**
 * Statements 2 a 5 do painel, em paralelo: o histórico de estudo da pessoa.
 * O painel do aluno e a tela de acesso do admin leem o mesmo.
 */
export async function linhasDoHistorico(
  db: Database,
  userId: string
): Promise<LinhasHistorico> {
  const [assistidas, posicoes, certificados, questionarios] = await Promise.all(
    [
      // 2. aulas assistidas (inclusive de curso revogado; a montagem ignora as de fora do catálogo)
      db
        .select({
          assistidaEm: aulaAssistida.assistidaEm,
          aulaId: aulaAssistida.aulaId,
        })
        .from(aulaAssistida)
        .where(eq(aulaAssistida.userId, userId)),
      // 3. posições com segundo > 0
      db
        .select({
          atualizadaEm: posicaoAula.atualizadaEm,
          aulaId: posicaoAula.aulaId,
          posicaoSeg: posicaoAula.posicaoSeg,
        })
        .from(posicaoAula)
        .where(
          and(eq(posicaoAula.userId, userId), gt(posicaoAula.posicaoSeg, 0))
        ),
      // 4. certificados
      db
        .select({
          codigo: certificado.codigo,
          cursoId: certificado.cursoId,
          emitidoEm: certificado.emitidoEm,
        })
        .from(certificado)
        .where(eq(certificado.userId, userId)),
      // 5. os questionários tentados
      linhasDosQuestionarios(db, userId),
    ]
  );
  return { assistidas, certificados, posicoes, questionarios };
}

// Nenhuma consulta usa .prepare("nome"): o pooler de transação (porta 6543) não aceita
// prepared statement nomeado. Os statements correm em paralelo no Pool do node-postgres.
export async function linhasDoPainel(db: Database, userId: string) {
  const [liberacoes, historico, comunicados] = await Promise.all([
    // 1. liberações ativas com o catálogo inteiro (um SQL com left join lateral)
    db.query.liberacao.findMany({
      columns: { liberadaEm: true },
      orderBy: (l, { asc }) => [asc(l.liberadaEm), asc(l.id)],
      where: filtroLiberacaoAtiva(userId),
      with: { curso: COM_CONTEUDO },
    }),
    // 2 a 5
    linhasDoHistorico(db, userId),
    db
      .select({
        cursoId: comunicado.cursoId,
        id: comunicado.id,
        publicadoEm: comunicado.publicadoEm,
        texto: comunicado.texto,
        titulo: comunicado.titulo,
      })
      .from(comunicado)
      .where(comunicadoVisivelPara(db, userId))
      .orderBy(...DO_MAIS_NOVO)
      .limit(1),
  ]);
  return { ...historico, comunicados, liberacoes };
}

export async function linhasDoResumo(
  db: Database,
  userId: string,
  segunda: DiaISO
) {
  const [dias, pontos] = await Promise.all([
    // 6. dias com aula assistida pela primeira vez
    db
      .selectDistinct({ dia: aulaAssistida.dia })
      .from(aulaAssistida)
      .where(eq(aulaAssistida.userId, userId)),
    linhasDoSaldo(db, userId, segunda),
  ]);
  return { dias, pontos };
}

export async function carregarPainel(
  db: Database,
  userId: string,
  agora: Date
): Promise<PainelMeusCursos> {
  return montarPainel(await linhasDoPainel(db, userId), diaLocal(agora));
}

export async function carregarResumo(
  db: Database,
  userId: string,
  agora: Date
): Promise<ResumoAluno> {
  const hoje = diaLocal(agora);
  return montarResumo(
    await linhasDoResumo(db, userId, segundaDaSemana(hoje)),
    hoje
  );
}
