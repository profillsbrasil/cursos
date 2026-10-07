import { COTA_VIDEO, META_SEQUENCIA, PONTOS } from "./regras";
import { ehDiaUtil, sequenciaDiasUteis } from "./sequencia";
import type { AulaId, DiaISO } from "./tipos";
import {
  atingiuMeta,
  type Cobertura,
  canonizar,
  primeiros,
  segundos,
  subtrair,
  type Trecho,
  type Trechos,
  unir,
} from "./trechos";

export interface Cota {
  atualizadaEm: Date;
  segundos: number;
}

/**
 * Segundos de vídeo novo que o aluno pode registrar agora. Sem cota, o balde está
 * cheio. Relógio que voltou (dois servidores) não enche nem esvazia.
 */
export function recarregar(cota: Cota | null, agora: Date): number {
  if (!cota) {
    return COTA_VIDEO.tetoSeg;
  }
  const passouSeg = Math.max(
    0,
    (agora.getTime() - cota.atualizadaEm.getTime()) / 1000
  );
  return Math.min(
    COTA_VIDEO.tetoSeg,
    cota.segundos + passouSeg * COTA_VIDEO.velocidadeMaxima
  );
}

export interface EstudoSalvo {
  assistida: boolean;
  duracaoSeg: number;
  trechos: Trechos;
}

/** O que o cliente manda: trechos na ordem em que o vídeo tocou, e onde parou. */
export interface Pedido {
  posicaoSeg: number;
  trechos: readonly Trecho[];
}

export interface Aplicacao {
  aceitosSeg: number;
  /** A gravar. atualizadaEm nunca volta: relógio atrasado mantém o da cota. */
  cota: Cota;
  /** Limitada a [0, duracaoSeg]. */
  posicaoSeg: number;
  recusadosSeg: number;
  /** Os salvos unidos aos aceitos. */
  trechos: Trechos;
  /** Só true na chamada em que a cobertura cruzou a meta e a aula ainda não era assistida. */
  viraAssistida: boolean;
}

/**
 * O mesmo estado, pedido e relógio dão a mesma resposta. Aplicar o mesmo pedido
 * duas vezes não muda nada na segunda: segundo já coberto não gasta cota.
 */
export function aplicarRegistro(
  salvo: EstudoSalvo,
  cota: Cota | null,
  pedido: Pedido,
  agora: Date
): Aplicacao {
  let disponivel = recarregar(cota, agora);
  let acumulado = salvo.trechos;
  let aceitosSeg = 0;
  let recusadosSeg = 0;
  // A ordem do cliente é a ordem em que o vídeo tocou: a cota corta o fim, não o começo.
  for (const t of pedido.trechos) {
    const novos = subtrair(canonizar([t], salvo.duracaoSeg), acumulado);
    const levar = primeiros(novos, disponivel);
    const levados = segundos(levar);
    acumulado = unir(acumulado, levar);
    aceitosSeg += levados;
    recusadosSeg += segundos(novos) - levados;
    disponivel -= levados;
  }
  return {
    aceitosSeg,
    cota: {
      atualizadaEm:
        cota && cota.atualizadaEm > agora ? cota.atualizadaEm : agora,
      segundos: disponivel,
    },
    posicaoSeg: Math.min(Math.max(pedido.posicaoSeg, 0), salvo.duracaoSeg),
    recusadosSeg,
    trechos: acumulado,
    viraAssistida:
      !salvo.assistida && atingiuMeta(segundos(acumulado), salvo.duracaoSeg),
  };
}

/** Espelha o check ponto_lancamento_referencia. */
export type LancamentoNovo =
  | { aulaId: AulaId; motivo: "aula_assistida"; pontos: number }
  | { diaMarco: DiaISO; motivo: "sequencia_7_dias"; pontos: number };

export interface EfeitosDaAssistida {
  lancamentos: readonly LancamentoNovo[];
  sequenciaDias: number;
}

/**
 * Efeitos de uma aula assistida pela primeira vez no `dia` gerado pelo banco.
 * `diasAntes` são os dias com aula assistida antes desta.
 */
export function lancamentosDaAssistida(
  aulaId: AulaId,
  dia: DiaISO,
  diasAntes: ReadonlySet<DiaISO>
): EfeitosDaAssistida {
  const sequenciaDias = sequenciaDiasUteis(new Set(diasAntes).add(dia), dia);
  const lancamentos: LancamentoNovo[] = [
    { aulaId, motivo: "aula_assistida", pontos: PONTOS.aula_assistida },
  ];
  // Só o primeiro fato de um dia útil mexe na sequência.
  const fechouBloco =
    !diasAntes.has(dia) &&
    ehDiaUtil(dia) &&
    sequenciaDias > 0 &&
    sequenciaDias % META_SEQUENCIA === 0;
  if (fechouBloco) {
    lancamentos.push({
      diaMarco: dia,
      motivo: "sequencia_7_dias",
      pontos: PONTOS.sequencia_7_dias,
    });
  }
  return { lancamentos, sequenciaDias };
}

/** O que o aviso "+10 pts" mostra. */
export interface Conquista {
  bonusSequencia: number | null;
  pontos: number;
  sequenciaDias: number;
}

/** Monta o aviso com os lançamentos que de fato entraram no banco. */
export function conquistaDe(
  gravados: readonly { motivo: string; pontos: number }[],
  sequenciaDias: number
): Conquista {
  const pontosDe = (motivo: LancamentoNovo["motivo"]) =>
    gravados.find((l) => l.motivo === motivo)?.pontos ?? null;
  return {
    bonusSequencia: pontosDe("sequencia_7_dias"),
    pontos: pontosDe("aula_assistida") ?? 0,
    sequenciaDias,
  };
}

/**
 * Saída de aula.registrar: o estado do servidor depois da chamada, mais o evento
 * dela. No JSON a marca de `Trechos` some; o cliente passa por canonizar ao receber.
 */
export interface Registro {
  assistida: boolean;
  cobertura: Cobertura;
  /** Só na chamada que criou a aula assistida. */
  conquista: Conquista | null;
  recusadosSeg: number;
  trechos: Trechos;
}
