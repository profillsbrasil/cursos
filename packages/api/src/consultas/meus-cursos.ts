import type { Database } from "@cursos/db";
import {
  aulaAssistida,
  certificado,
  comunicado,
  pontoLancamento,
  posicaoAula,
} from "@cursos/db/schema/index";
import { and, desc, eq, gt, sql } from "drizzle-orm";

import {
  montarPainel,
  montarResumo,
  type PainelMeusCursos,
  type ResumoAluno,
} from "../dominio/painel";
import { diaLocal, segundaDaSemana } from "../dominio/sequencia";
import type { DiaISO } from "../dominio/tipos";

const FUSO = "America/Sao_Paulo";

const COM_CONTEUDO = {
  columns: {
    capaAlt: true,
    capaUrl: true,
    codigo: true,
    destaque: true,
    id: true,
    slug: true,
    status: true,
    tema: true,
    titulo: true,
  },
  with: {
    modulos: {
      columns: { nivelOrdem: true, numero: true, titulo: true },
      orderBy: { numero: "asc" },
      with: {
        aulas: {
          columns: { duracaoSeg: true, id: true, posicao: true, titulo: true },
          orderBy: { posicao: "asc" },
        },
      },
    },
    niveis: { columns: { nome: true, ordem: true }, orderBy: { ordem: "asc" } },
  },
} as const;

// Nenhuma consulta usa .prepare("nome"): o pooler de transação (porta 6543) não aceita
// prepared statement nomeado. Os statements correm em paralelo no Pool do node-postgres.
export async function linhasDoPainel(db: Database, userId: string) {
  const [liberacoes, assistidas, posicoes, certificados, comunicados] =
    await Promise.all([
      // 1. liberações ativas com o catálogo inteiro (um SQL com left join lateral)
      db.query.liberacao.findMany({
        columns: { liberadaEm: true },
        orderBy: { liberadaEm: "asc" },
        where: { revogadaEm: { isNull: true }, userId },
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
      // 5. últimos 20 comunicados; o filtro por curso acessível é feito em montarPainel
      db
        .select({
          cursoId: comunicado.cursoId,
          id: comunicado.id,
          publicadoEm: comunicado.publicadoEm,
          texto: comunicado.texto,
          titulo: comunicado.titulo,
        })
        .from(comunicado)
        .orderBy(desc(comunicado.publicadoEm))
        .limit(20),
    ]);
  return { assistidas, certificados, comunicados, liberacoes, posicoes };
}

export async function linhasDoResumo(
  db: Database,
  userId: string,
  segunda: DiaISO
) {
  const [dias, [pontos]] = await Promise.all([
    // 6. dias com aula assistida pela primeira vez
    db
      .selectDistinct({ dia: aulaAssistida.dia })
      .from(aulaAssistida)
      .where(eq(aulaAssistida.userId, userId)),
    // 7. saldo e pontos da semana numa linha; o filtro usa o índice (user_id, criado_em)
    db
      .select({
        saldo: sql<number>`coalesce(sum(${pontoLancamento.pontos}), 0)::int`,
        semana: sql<number>`coalesce(sum(${pontoLancamento.pontos}) filter (
          where ${pontoLancamento.criadoEm} >= (${segunda}::date)::timestamp at time zone ${FUSO}), 0)::int`,
      })
      .from(pontoLancamento)
      .where(eq(pontoLancamento.userId, userId)),
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
