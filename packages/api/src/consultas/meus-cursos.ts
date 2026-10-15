import type { Database } from "@cursos/db";
import {
  aulaAssistida,
  certificado,
  comunicado,
  liberacao,
  posicaoAula,
  trilhaCurso,
} from "@cursos/db/schema/index";
import { and, desc, eq, gt, inArray, isNotNull, isNull, or } from "drizzle-orm";

import {
  montarPainel,
  montarResumo,
  type PainelMeusCursos,
  type ResumoAluno,
} from "../dominio/painel";
import { diaLocal, segundaDaSemana } from "../dominio/sequencia";
import type { DiaISO } from "../dominio/tipos";
import { COM_CONTEUDO } from "./catalogo";
import { filtroLiberacaoAtiva } from "./comum";
import { linhasDoSaldo } from "./pontos";

// Nenhuma consulta usa .prepare("nome"): o pooler de transação (porta 6543) não aceita
// prepared statement nomeado. Os statements correm em paralelo no Pool do node-postgres.
export async function linhasDoPainel(db: Database, userId: string) {
  const [liberacoes, assistidas, posicoes, certificados, comunicados] =
    await Promise.all([
      // 1. liberações ativas com o catálogo inteiro (um SQL com left join lateral)
      db.query.liberacao.findMany({
        columns: { liberadaEm: true },
        orderBy: (l, { asc }) => [asc(l.liberadaEm), asc(l.id)],
        where: filtroLiberacaoAtiva(userId),
        with: {
          curso: COM_CONTEUDO,
          trilha: {
            columns: { descricao: true, id: true, slug: true, titulo: true },
            with: {
              cursos: {
                columns: { posicao: true },
                orderBy: { posicao: "asc" },
                with: { curso: COM_CONTEUDO },
              },
            },
          },
        },
      }),
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
      // 5. o comunicado mais recente que o aluno pode ver: geral, de curso liberado
      // direto ou de curso de trilha liberada. O filtro fica no SQL para que
      // comunicados de cursos fora do alcance não empurrem o dele para fora do limit.
      db
        .select({
          cursoId: comunicado.cursoId,
          id: comunicado.id,
          publicadoEm: comunicado.publicadoEm,
          texto: comunicado.texto,
          titulo: comunicado.titulo,
        })
        .from(comunicado)
        .where(
          or(
            isNull(comunicado.cursoId),
            inArray(
              comunicado.cursoId,
              db
                .select({ id: liberacao.cursoId })
                .from(liberacao)
                .where(
                  and(
                    eq(liberacao.userId, userId),
                    isNull(liberacao.revogadaEm),
                    isNotNull(liberacao.cursoId)
                  )
                )
            ),
            inArray(
              comunicado.cursoId,
              db
                .select({ id: trilhaCurso.cursoId })
                .from(trilhaCurso)
                .innerJoin(
                  liberacao,
                  eq(liberacao.trilhaId, trilhaCurso.trilhaId)
                )
                .where(
                  and(
                    eq(liberacao.userId, userId),
                    isNull(liberacao.revogadaEm)
                  )
                )
            )
          )
        )
        .orderBy(desc(comunicado.publicadoEm))
        .limit(1),
    ]);
  return { assistidas, certificados, comunicados, liberacoes, posicoes };
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
  _agora: Date
): Promise<PainelMeusCursos> {
  return montarPainel(await linhasDoPainel(db, userId));
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
