import type { AulaId, CursoId, Historico } from "./tipos";

/** As tentativas de uma aula, somadas pelo banco: uma linha por aula tentada. */
export interface LinhaDoQuestionario {
  aprovada: boolean;
  aulaId: string;
  tentativas: number;
  ultimaEm: Date;
  ultimosAcertos: number;
  ultimoTotal: number;
}

export interface LinhasHistorico {
  assistidas: readonly { assistidaEm: Date; aulaId: string }[];
  certificados: readonly { codigo: string; cursoId: string; emitidoEm: Date }[];
  posicoes: readonly {
    atualizadaEm: Date;
    aulaId: string;
    posicaoSeg: number;
  }[];
  questionarios: readonly LinhaDoQuestionario[];
}

export const posicaoComecada = (p: { posicaoSeg: number }): boolean =>
  p.posicaoSeg > 0;

export function historicoDe(l: LinhasHistorico): Historico {
  return {
    assistidas: new Set(l.assistidas.map((a) => a.aulaId as AulaId)),
    certificados: new Map(
      l.certificados.map((c) => [
        c.cursoId as CursoId,
        { codigo: c.codigo, emitidoEm: c.emitidoEm.toISOString() },
      ])
    ),
    posicoes: new Map(
      l.posicoes.filter(posicaoComecada).map((p) => [
        p.aulaId as AulaId,
        {
          atualizadaEm: p.atualizadaEm.toISOString(),
          posicaoSeg: p.posicaoSeg,
        },
      ])
    ),
    questionarios: new Map(
      l.questionarios.map((q) => [
        q.aulaId as AulaId,
        {
          aprovada: q.aprovada,
          tentativas: q.tentativas,
          ultima: { acertos: q.ultimosAcertos, total: q.ultimoTotal },
        },
      ])
    ),
  };
}

export function atividadeDe(l: LinhasHistorico): Map<AulaId, string> {
  const atividade = new Map<AulaId, string>();
  const anotar = (aulaId: string, quando: Date) => {
    const iso = quando.toISOString();
    const atual = atividade.get(aulaId as AulaId);
    if (!atual || iso > atual) {
      atividade.set(aulaId as AulaId, iso);
    }
  };
  for (const a of l.assistidas) {
    anotar(a.aulaId, a.assistidaEm);
  }
  for (const p of l.posicoes) {
    anotar(p.aulaId, p.atualizadaEm);
  }
  for (const q of l.questionarios) {
    anotar(q.aulaId, q.ultimaEm);
  }
  return atividade;
}
