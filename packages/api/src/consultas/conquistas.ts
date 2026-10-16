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
} from "@cursos/db/schema/index";
import { and, eq, gt, inArray } from "drizzle-orm";

import {
  type Conquistas,
  type LinhasDasConquistas,
  montarConquistas,
} from "../dominio/conquistas";
import { diaLocal } from "../dominio/sequencia";
import { COM_CONTEUDO } from "./catalogo";
import { filtroLiberacaoAtiva } from "./comum";
import { linhasDosQuestionarios } from "./meus-cursos";
import { linhasDosCursos } from "./troca";

const CURSO_DO_CERTIFICADO = {
  capaAlt: curso.capaAlt,
  capaAltura: curso.capaAltura,
  capaLargura: curso.capaLargura,
  capaUrl: curso.capaUrl,
  slug: curso.slug,
  titulo: curso.titulo,
};

/** Sete statements em paralelo, como o painel de Meus cursos. */
export async function linhasDasConquistas(
  db: Database,
  userId: string
): Promise<LinhasDasConquistas> {
  const [
    liberacoes,
    assistidas,
    posicoes,
    certificados,
    lancamentos,
    vitrine,
    questionarios,
  ] = await Promise.all([
    // 1. liberações ativas com o catálogo
    db.query.liberacao.findMany({
      columns: { liberadaEm: true },
      orderBy: (l, { asc }) => [asc(l.liberadaEm), asc(l.id)],
      where: filtroLiberacaoAtiva(userId),
      with: { curso: COM_CONTEUDO },
    }),
    // 2. toda aula assistida, com os títulos da aula e do curso
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
    // 4. todo certificado, com o título, o endereço e a capa do curso
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
    // 5. lançamentos de sequência e de troca, com o curso trocado
    db
      .select({
        criadoEm: pontoLancamento.criadoEm,
        curso: curso.titulo,
        motivo: pontoLancamento.motivo,
        pontos: pontoLancamento.pontos,
      })
      .from(pontoLancamento)
      .leftJoin(
        liberacao,
        and(
          eq(liberacao.userId, pontoLancamento.userId),
          eq(liberacao.id, pontoLancamento.liberacaoId)
        )
      )
      .leftJoin(curso, eq(curso.id, liberacao.cursoId))
      .where(
        and(
          eq(pontoLancamento.userId, userId),
          inArray(pontoLancamento.motivo, ["sequencia_7_dias", "troca"])
        )
      ),
    // 6. a vitrine de Trocar pontos
    linhasDosCursos(db, userId, "vitrine"),
    // 7. os questionários por aula, como no painel
    linhasDosQuestionarios(db, userId),
  ]);
  return {
    assistidas,
    certificados,
    lancamentos,
    liberacoes,
    posicoes,
    questionarios,
    vitrine,
  };
}

export async function carregarConquistas(
  db: Database,
  userId: string,
  agora: Date
): Promise<Conquistas> {
  return montarConquistas(
    await linhasDasConquistas(db, userId),
    diaLocal(agora)
  );
}
