import type { Database } from "@cursos/db";
import {
  aulaAssistida,
  certificado,
  comunicado,
  posicaoAula,
  questionarioTentativa,
} from "@cursos/db/schema/index";
import { and, eq, gt, inArray, sql } from "drizzle-orm";

import type {
  LinhaDoQuestionario,
  LinhasHistorico,
} from "../dominio/historico";
import {
  type LinhasPainel,
  montarPainel,
  montarResumo,
  type PainelMeusCursos,
  type ResumoAluno,
} from "../dominio/painel";
import type { Aluno } from "../dominio/perfil";
import { diaLocal, segundaDaSemana } from "../dominio/sequencia";
import type { AulaId, CursoId, DiaISO } from "../dominio/tipos";
import { COM_CONTEUDO } from "./catalogo";
import {
  cursoQueOAlunoVe,
  type Executor,
  filtroDoPerfilAtivo,
  filtroLiberacaoAtiva,
} from "./comum";
import { comunicadoVisivelPara, DO_MAIS_NOVO } from "./comunicado";
import { linhasDoSaldo } from "./pontos";
import type { AlunoTravado } from "./trava";

/** A leitura dentro da transação da emissão: as aulas e o certificado de um curso. */
interface SoNoCurso {
  aulas: readonly AulaId[];
  cursoId: CursoId;
}

/** As colunas de `linhasDosQuestionarios`, que Conquistas estende. */
export const COLUNAS_DO_QUESTIONARIO = {
  aprovada: sql<boolean>`bool_or(${questionarioTentativa.aprovada})`,
  aulaId: questionarioTentativa.aulaId,
  tentativas: sql<number>`count(*)::int`,
  ultimaEm: sql`max(${questionarioTentativa.enviadaEm})`.mapWith(
    questionarioTentativa.enviadaEm
  ),
  ultimosAcertos: sql<number>`(array_agg(${questionarioTentativa.acertos} order by ${questionarioTentativa.numero} desc))[1]`,
  ultimoTotal: sql<number>`(array_agg(${questionarioTentativa.total} order by ${questionarioTentativa.numero} desc))[1]`,
};

/**
 * As tentativas da pessoa somadas por aula: se aprovou, quantas foram, quando foi
 * a última e a nota dela. Uma linha por aula tentada.
 */
export function linhasDosQuestionarios(
  exec: Executor,
  userId: string,
  aulas?: readonly AulaId[]
): Promise<LinhaDoQuestionario[]> {
  const t = questionarioTentativa;

  return exec
    .select(COLUNAS_DO_QUESTIONARIO)
    .from(t)
    .where(
      and(
        eq(t.userId, userId),
        aulas === undefined ? undefined : inArray(t.aulaId, [...aulas])
      )
    )
    .groupBy(t.aulaId);
}

function consultasDoHistorico(
  exec: Executor,
  userId: string,
  noCurso?: SoNoCurso
) {
  const aulas = noCurso && [...noCurso.aulas];

  return [
    exec
      .select({
        assistidaEm: aulaAssistida.assistidaEm,
        aulaId: aulaAssistida.aulaId,
      })
      .from(aulaAssistida)
      .where(
        and(
          eq(aulaAssistida.userId, userId),
          aulas && inArray(aulaAssistida.aulaId, aulas)
        )
      ),
    exec
      .select({
        atualizadaEm: posicaoAula.atualizadaEm,
        aulaId: posicaoAula.aulaId,
        posicaoSeg: posicaoAula.posicaoSeg,
      })
      .from(posicaoAula)
      .where(
        and(
          eq(posicaoAula.userId, userId),
          gt(posicaoAula.posicaoSeg, 0),
          aulas && inArray(posicaoAula.aulaId, aulas)
        )
      ),
    exec
      .select({
        codigo: certificado.codigo,
        cursoId: certificado.cursoId,
        emitidoEm: certificado.emitidoEm,
      })
      .from(certificado)
      .where(
        and(
          eq(certificado.userId, userId),
          noCurso && eq(certificado.cursoId, noCurso.cursoId)
        )
      ),
    linhasDosQuestionarios(exec, userId, aulas),
  ] as const;
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
    consultasDoHistorico(db, userId)
  );

  return { assistidas, certificados, posicoes, questionarios };
}

/**
 * O mesmo histórico, só das aulas e do certificado de um curso, com o aluno
 * travado: a emissão do certificado decide com a leitura da tela. Dentro da
 * transação os statements rodam em série, num client só.
 */
export async function linhasDoHistoricoNoCurso(
  aluno: AlunoTravado,
  noCurso: SoNoCurso
): Promise<LinhasHistorico> {
  const [assistidas, posicoes, certificados, questionarios] =
    consultasDoHistorico(aluno.tx, aluno.userId, noCurso);

  return {
    assistidas: await assistidas,
    certificados: await certificados,
    posicoes: await posicoes,
    questionarios: await questionarios,
  };
}

/**
 * Os cursos que o aluno vê, com o catálogo inteiro, num SQL só (left join
 * lateral). Cada um vale pela liberação ativa mais antiga, própria ou do perfil,
 * e a lista sai nessa ordem: a data e, no empate, o id da liberação. O curso sem
 * liberação própria ativa é a amostra, com o preço de troca.
 */
export async function linhasDosCursosQueOAlunoVe(
  exec: Executor,
  aluno: Aluno
): Promise<LinhasPainel["liberacoes"]> {
  const DA_LIBERACAO = { id: true, liberadaEm: true } as const;

  const cursos = await exec.query.curso.findMany({
    ...COM_CONTEUDO,
    columns: { ...COM_CONTEUDO.columns, precoTroca: true },
    where: cursoQueOAlunoVe(aluno),
    with: {
      ...COM_CONTEUDO.with,
      liberacoes: {
        columns: DA_LIBERACAO,
        where: filtroLiberacaoAtiva(aluno.userId),
      },
      liberacoesDoPerfil: {
        columns: DA_LIBERACAO,
        where: filtroDoPerfilAtivo(aluno.perfil),
      },
    },
  });

  const antes = (a: Liberada, b: Liberada) =>
    a.liberadaEm.getTime() - b.liberadaEm.getTime() || a.id.localeCompare(b.id);

  return cursos
    .flatMap(({ liberacoes, liberacoesDoPerfil, precoTroca, ...curso }) => {
      const [primeira] = [...liberacoes, ...liberacoesDoPerfil].sort(antes);
      const amostra = liberacoes.length > 0 ? null : { preco: precoTroca };

      return primeira ? [{ amostra, curso, primeira }] : [];
    })
    .sort((a, b) => antes(a.primeira, b.primeira))
    .map(({ amostra, curso, primeira }) => ({
      amostra,
      curso,
      liberadaEm: primeira.liberadaEm,
    }));
}

interface Liberada {
  id: string;
  liberadaEm: Date;
}

// WARNING: nenhuma consulta usa .prepare("nome"): o pooler de transação (porta 6543) não aceita prepared statement nomeado.
export async function linhasDoPainel(db: Database, aluno: Aluno) {
  const { userId } = aluno;

  const [liberacoes, historico, comunicados] = await Promise.all([
    linhasDosCursosQueOAlunoVe(db, aluno),
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
      .where(comunicadoVisivelPara(db, aluno))
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
  aluno: Aluno,
  agora: Date
): Promise<PainelMeusCursos> {
  return montarPainel(await linhasDoPainel(db, aluno), diaLocal(agora));
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
