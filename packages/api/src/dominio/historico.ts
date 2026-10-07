import type { AulaId, CursoId, Historico } from "./tipos";

export interface LinhasHistorico {
  assistidas: readonly { assistidaEm: Date; aulaId: string }[];
  certificados: readonly { codigo: string; cursoId: string; emitidoEm: Date }[];
  posicoes: readonly {
    atualizadaEm: Date;
    aulaId: string;
    posicaoSeg: number;
  }[];
}

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
      l.posicoes.map((p) => [
        p.aulaId as AulaId,
        {
          atualizadaEm: p.atualizadaEm.toISOString(),
          posicaoSeg: p.posicaoSeg,
        },
      ])
    ),
  };
}

/** Última atividade por aula: a mais recente entre assistir e salvar posição. */
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
  return atividade;
}
