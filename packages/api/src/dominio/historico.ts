import type { AulaId, CursoId, Historico } from "./tipos";

/** As tentativas de uma aula, somadas pelo banco: uma linha por aula tentada. */
export interface LinhaDoQuestionario {
  aprovada: boolean;
  aulaId: AulaId;
  tentativas: number;
  ultimaEm: Date;
  ultimosAcertos: number;
  ultimoTotal: number;
}

export interface LinhasHistorico {
  assistidas: readonly { assistidaEm: Date; aulaId: AulaId }[];
  certificados: readonly {
    codigo: string;
    cursoId: CursoId;
    emitidoEm: Date;
  }[];
  posicoes: readonly {
    atualizadaEm: Date;
    aulaId: AulaId;
    posicaoSeg: number;
  }[];
  questionarios: readonly LinhaDoQuestionario[];
}

const posicaoComecada = (p: { posicaoSeg: number }): boolean =>
  p.posicaoSeg > 0;

function historicoDe(l: LinhasHistorico): Historico {
  return {
    assistidas: new Set(l.assistidas.map((a) => a.aulaId)),
    certificados: new Map(
      l.certificados.map((c) => [
        c.cursoId,
        { codigo: c.codigo, emitidoEm: c.emitidoEm.toISOString() },
      ])
    ),
    posicoes: new Map(
      l.posicoes.filter(posicaoComecada).map((p) => [
        p.aulaId,
        {
          atualizadaEm: p.atualizadaEm.toISOString(),
          posicaoSeg: p.posicaoSeg,
        },
      ])
    ),
    questionarios: new Map(
      l.questionarios.map((q) => [
        q.aulaId,
        {
          aprovada: q.aprovada,
          tentativas: q.tentativas,
          ultima: { acertos: q.ultimosAcertos, total: q.ultimoTotal },
        },
      ])
    ),
  };
}

function atividadeDe(l: LinhasHistorico): Map<AulaId, string> {
  const atividade = new Map<AulaId, string>();

  const anotar = (aulaId: AulaId, quando: Date) => {
    const iso = quando.toISOString();
    const atual = atividade.get(aulaId);

    if (!atual || iso > atual) {
      atividade.set(aulaId, iso);
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

/** O histórico da pessoa e o último momento de estudo de cada aula. */
export interface Estudo {
  atividade: ReadonlyMap<AulaId, string>;
  historico: Historico;
}

/** Posição em 0 s não é estudo: nem o histórico nem a atividade a contam. */
export function estudoDe(l: LinhasHistorico): Estudo {
  const comecadas = { ...l, posicoes: l.posicoes.filter(posicaoComecada) };

  return {
    atividade: atividadeDe(comecadas),
    historico: historicoDe(comecadas),
  };
}
