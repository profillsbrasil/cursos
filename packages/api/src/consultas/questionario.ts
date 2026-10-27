import type { Database } from "@cursos/db";
import {
  pontoLancamento,
  questionarioResposta,
  questionarioTentativa,
} from "@cursos/db/schema/index";
import { and, eq } from "drizzle-orm";

import {
  abreAAula,
  aulaPorId,
  type LinhasDoQuestionario,
  montarCursoVisto,
} from "../dominio/aula";
import type { Aluno, Perfil } from "../dominio/perfil";
import {
  corrigir,
  type PerguntaComGabarito,
  pontosDaTentativa,
  type RespostaEnviada,
  type ResultadoDoQuestionario,
  resultadoDaTentativa,
  type TentativaGravada,
} from "../dominio/questionario";
import type {
  AlternativaId,
  AulaId,
  CursoId,
  PerguntaId,
  TentativaId,
} from "../dominio/tipos";
import { ErroParaAPessoa } from "../index";
import { linhasDoCurso } from "./aula";
import { type Conclusao, concluirCurso } from "./certificado";
import type { Executor } from "./comum";
import { type AlunoTravado, comAlunoTravado } from "./trava";

export async function perguntasDaAula(
  exec: Executor,
  aulaId: AulaId
): Promise<PerguntaComGabarito[]> {
  const perguntas = await exec.query.pergunta.findMany({
    columns: { enunciado: true, id: true },
    orderBy: { posicao: "asc" },
    where: { aulaId },
    with: {
      alternativas: {
        columns: { certa: true, id: true, texto: true },
        orderBy: { posicao: "asc" },
      },
    },
  });
  return perguntas.map((p) => {
    const certa = p.alternativas.find((a) => a.certa);
    if (!certa) {
      throw new Error(`Pergunta ${p.id} sem alternativa certa.`);
    }
    return {
      alternativas: p.alternativas.map((a) => ({
        id: a.id as AlternativaId,
        texto: a.texto,
      })),
      certa: certa.id as AlternativaId,
      enunciado: p.enunciado,
      id: p.id as PerguntaId,
    };
  });
}

export function tentativasDaAula(
  exec: Executor,
  userId: string,
  aulaId: AulaId
): Promise<TentativaGravada[]> {
  return exec.query.questionarioTentativa.findMany({
    columns: {
      acertos: true,
      aprovada: true,
      numero: true,
      total: true,
    },
    orderBy: { numero: "asc" },
    where: { aulaId, userId },
    with: {
      respostas: {
        columns: { alternativaId: true, certa: true, perguntaId: true },
      },
    },
  });
}

/** Em série: a consulta roda também dentro da transação do envio, num client só. */
export async function linhasDoQuestionario(
  exec: Executor,
  userId: string,
  aulaId: AulaId
): Promise<LinhasDoQuestionario> {
  const perguntas = await perguntasDaAula(exec, aulaId);
  const tentativas = await tentativasDaAula(exec, userId, aulaId);
  return { perguntas, tentativas };
}

export interface EnvioDoQuestionario {
  aulaId: AulaId;
  respostas: readonly RespostaEnviada[];
  /** Nasce no cliente a cada tentativa: reenviar não cria outra. */
  tentativaId: TentativaId;
}

export interface RespostaAoEnvio {
  /** O certificado que esta tentativa emitiu, quando ela concluiu o curso. */
  cursoConcluido: Conclusao | null;
  resultado: ResultadoDoQuestionario;
}

/** O id que o cliente mandou já é de uma tentativa que não é desta aula do aluno. */
export const TENTATIVA_EM_USO =
  "Não deu para gravar esta tentativa. Recarregue a página e responda de novo.";

const erroSemAcesso = () =>
  new ErroParaAPessoa({ code: "NOT_FOUND", message: "Aula não encontrada." });

async function tentativaPorId(aluno: AlunoTravado, id: TentativaId) {
  const [t] = await aluno.tx
    .select({ aulaId: questionarioTentativa.aulaId })
    .from(questionarioTentativa)
    .where(
      and(
        eq(questionarioTentativa.id, id),
        eq(questionarioTentativa.userId, aluno.userId)
      )
    );
  return t ?? null;
}

async function gravarTentativa(
  aluno: AlunoTravado,
  envio: EnvioDoQuestionario,
  tentativa: TentativaGravada,
  agora: Date
) {
  // O reenvio do próprio aluno já voltou em resultadoGravado. O id que ainda
  // colide é de outra pessoa (a trava é por aluno) ou de outra aula, e a recusa
  // não diz de quem.
  const [gravada] = await aluno.tx
    .insert(questionarioTentativa)
    .values({
      acertos: tentativa.acertos,
      aprovada: tentativa.aprovada,
      aulaId: envio.aulaId,
      enviadaEm: agora,
      id: envio.tentativaId,
      numero: tentativa.numero,
      total: tentativa.total,
      userId: aluno.userId,
    })
    .onConflictDoNothing({ target: questionarioTentativa.id })
    .returning({ id: questionarioTentativa.id });
  if (!gravada) {
    throw new ErroParaAPessoa({ code: "CONFLICT", message: TENTATIVA_EM_USO });
  }
  await aluno.tx.insert(questionarioResposta).values(
    tentativa.respostas.map((r) => ({
      alternativaId: r.alternativaId,
      certa: r.certa,
      perguntaId: r.perguntaId,
      tentativaId: envio.tentativaId,
    }))
  );
  const pontos = pontosDaTentativa(tentativa.numero, tentativa.acertos);
  if (pontos > 0) {
    await aluno.tx
      .insert(pontoLancamento)
      .values({
        criadoEm: agora,
        motivo: "questionario",
        pontos,
        tentativaId: envio.tentativaId,
        userId: aluno.userId,
      })
      .onConflictDoNothing();
  }
}

async function abrirQuestionario(
  aluno: AlunoTravado,
  perfil: Perfil,
  aulaId: AulaId
) {
  const aberto = montarCursoVisto(
    await linhasDoCurso(
      aluno.tx,
      { perfil, userId: aluno.userId },
      { aulaId },
      { serial: true }
    )
  );
  const aula = aberto && abreAAula(aberto, aulaId) && aulaPorId(aberto, aulaId);
  if (!(aberto && aula)) {
    throw erroSemAcesso();
  }
  if (aberto.amostra) {
    throw new ErroParaAPessoa({
      code: "PRECONDITION_FAILED",
      message: "A amostra não tem questionário. Troque o curso para responder.",
    });
  }
  const { perguntas, tentativas } = await linhasDoQuestionario(
    aluno.tx,
    aluno.userId,
    aulaId
  );
  if (perguntas.length === 0) {
    throw new ErroParaAPessoa({
      code: "PRECONDITION_FAILED",
      message: "Esta aula não tem questionário.",
    });
  }
  return { cursoId: aberto.curso.id as CursoId, perguntas, tentativas };
}

/**
 * A última tentativa gravada, quando o envio não cria outra: o id já gravado
 * (reenvio) ou o questionário já aprovado. null quando há o que corrigir.
 */
async function resultadoGravado(
  aluno: AlunoTravado,
  envio: EnvioDoQuestionario,
  perguntas: readonly PerguntaComGabarito[],
  tentativas: readonly TentativaGravada[]
): Promise<ResultadoDoQuestionario | null> {
  const [primeira] = tentativas;
  const ultima = tentativas.at(-1);
  if (!(primeira && ultima)) {
    return null;
  }
  const repetida = await tentativaPorId(aluno, envio.tentativaId);
  if (repetida && repetida.aulaId !== envio.aulaId) {
    throw new ErroParaAPessoa({
      code: "CONFLICT",
      message: "Esta tentativa é de outra aula.",
    });
  }
  return repetida || ultima.aprovada
    ? resultadoDaTentativa(perguntas, ultima, primeira)
    : null;
}

const erroIncompleto = (faltam: number) =>
  new ErroParaAPessoa({
    code: "BAD_REQUEST",
    message:
      faltam === 1
        ? "Falta responder 1 pergunta."
        : `Faltam responder ${faltam} perguntas.`,
  });

/**
 * questionario.responder. Uma transação com o aluno travado: relê o acesso e o
 * gabarito, corrige, grava a tentativa e as respostas, lança os pontos da
 * primeira tentativa e, se o curso ficou completo, emite o certificado. A
 * tentativa que já existe (reenvio) e o questionário já aprovado devolvem o
 * resultado gravado, sem escrever nada.
 */
export function responder(
  db: Database,
  { perfil, userId }: Aluno,
  envio: EnvioDoQuestionario,
  agora: Date
): Promise<RespostaAoEnvio> {
  return comAlunoTravado(db, userId, async (aluno) => {
    const { cursoId, perguntas, tentativas } = await abrirQuestionario(
      aluno,
      perfil,
      envio.aulaId
    );
    const gravado = await resultadoGravado(aluno, envio, perguntas, tentativas);
    if (gravado) {
      return { cursoConcluido: null, resultado: gravado };
    }
    const correcao = corrigir(perguntas, envio.respostas);
    if (correcao.tipo === "incompleta") {
      throw erroIncompleto(correcao.faltam);
    }
    const tentativa: TentativaGravada = {
      acertos: correcao.acertos,
      aprovada: correcao.aprovada,
      numero: tentativas.length + 1,
      respostas: correcao.respostas,
      total: correcao.total,
    };
    await gravarTentativa(aluno, envio, tentativa, agora);
    const cursoConcluido = tentativa.aprovada
      ? await concluirCurso(aluno, cursoId, agora)
      : null;
    return {
      cursoConcluido,
      resultado: resultadoDaTentativa(
        perguntas,
        tentativa,
        tentativas[0] ?? tentativa
      ),
    };
  });
}
