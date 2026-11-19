import type { Database } from "@cursos/db";
import {
  aula,
  aulaAssistida,
  certificado,
  curso,
  liberacao,
  modulo,
  pontoLancamento,
  posicaoAula,
  questionarioTentativa,
} from "@cursos/db/schema/index";
import { and, eq, gt, inArray, sql } from "drizzle-orm";

import {
  type Conquistas,
  type LinhasDasConquistas,
  montarConquistas,
} from "../dominio/conquistas";
import type { Aluno } from "../dominio/perfil";
import { diaLocal } from "../dominio/sequencia";
import type { Executor } from "./comum";
import {
  COLUNAS_DO_QUESTIONARIO,
  linhasDosCursosQueOAlunoVe,
} from "./meus-cursos";
import { estudoPorDia } from "./pontos";
import { linhasDosCursos } from "./troca";

const CURSO_DO_CERTIFICADO = {
  capaAlt: curso.capaAlt,
  capaAltura: curso.capaAltura,
  capaLargura: curso.capaLargura,
  capaUrl: curso.capaUrl,
  slug: curso.slug,
  titulo: curso.titulo,
};

function linhasDasTentativas(
  exec: Executor,
  userId: string
): Promise<LinhasDasConquistas["questionarios"]> {
  const t = questionarioTentativa;
  const daPrimeira = sql`filter (where ${t.numero} = 1)`;

  return exec
    .select({
      ...COLUNAS_DO_QUESTIONARIO,
      aprovadaEm: sql`min(${t.enviadaEm}) filter (where ${t.aprovada})`.mapWith(
        t.enviadaEm
      ),
      primeiraAcertos: sql<number | null>`max(${t.acertos}) ${daPrimeira}`,
      primeiraEm: sql`max(${t.enviadaEm}) ${daPrimeira}`.mapWith(t.enviadaEm),
      primeiraTotal: sql<number | null>`max(${t.total}) ${daPrimeira}`,
    })
    .from(t)
    .where(eq(t.userId, userId))
    .groupBy(t.aulaId);
}

/** Oito statements em paralelo, como o painel de Meus cursos. */
export async function linhasDasConquistas(
  db: Database,
  aluno: Aluno
): Promise<LinhasDasConquistas> {
  const { userId } = aluno;

  const [
    liberacoes,
    assistidas,
    posicoes,
    certificados,
    lancamentos,
    vitrine,
    questionarios,
    estudo,
  ] = await Promise.all([
    linhasDosCursosQueOAlunoVe(db, aluno),
    db
      .select({
        assistidaEm: aulaAssistida.assistidaEm,
        aula: aula.titulo,
        aulaId: aulaAssistida.aulaId,
        curso: curso.titulo,
      })
      .from(aulaAssistida)
      .innerJoin(aula, eq(aula.id, aulaAssistida.aulaId))
      .innerJoin(modulo, eq(modulo.id, aula.moduloId))
      .innerJoin(curso, eq(curso.id, modulo.cursoId))
      .where(eq(aulaAssistida.userId, userId)),
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
    db
      .select({
        codigo: certificado.codigo,
        curso: CURSO_DO_CERTIFICADO,
        cursoId: certificado.cursoId,
        emitidoEm: certificado.emitidoEm,
        segundosDeVideo: certificado.segundosDeVideo,
      })
      .from(certificado)
      .innerJoin(curso, eq(curso.id, certificado.cursoId))
      .where(eq(certificado.userId, userId)),
    db
      .select({
        criadoEm: pontoLancamento.criadoEm,
        cursoId: liberacao.cursoId,
        motivo: pontoLancamento.motivo,
      })
      .from(pontoLancamento)
      .leftJoin(
        liberacao,
        and(
          eq(liberacao.userId, pontoLancamento.userId),
          eq(liberacao.id, pontoLancamento.liberacaoId)
        )
      )
      .where(
        and(
          eq(pontoLancamento.userId, userId),
          inArray(pontoLancamento.motivo, ["sequencia_7_dias", "troca"])
        )
      ),
    linhasDosCursos(db, aluno, "vitrine"),
    linhasDasTentativas(db, userId),
    estudoPorDia(db, userId),
  ]);

  return {
    assistidas,
    certificados,
    estudoPorDia: estudo,
    lancamentos,
    liberacoes,
    posicoes,
    questionarios,
    vitrine,
  };
}

export async function carregarConquistas(
  db: Database,
  aluno: Aluno,
  agora: Date
): Promise<Conquistas> {
  return montarConquistas(
    await linhasDasConquistas(db, aluno),
    diaLocal(agora)
  );
}
