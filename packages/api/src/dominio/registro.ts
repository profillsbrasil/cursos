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

export function cotaDisponivel(cota: Cota | null, agora: Date): number {
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
  cota: Cota;
  posicaoSeg: number;
  recusadosSeg: number;
  trechos: Trechos;
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
  let disponivel = cotaDisponivel(cota, agora);
  let acumulado = salvo.trechos;
  let recusadosSeg = 0;
  for (const t of pedido.trechos) {
    const novos = subtrair(canonizar([t], salvo.duracaoSeg), acumulado);
    const levar = primeiros(novos, disponivel);
    const levados = segundos(levar);
    acumulado = unir(acumulado, levar);
    recusadosSeg += segundos(novos) - levados;
    disponivel -= levados;
  }
  return {
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

export type LancamentoNovo =
  | { aulaId: AulaId; motivo: "aula_assistida"; pontos: number }
  | { diaMarco: DiaISO; motivo: "sequencia_7_dias"; pontos: number };

export interface EfeitosDaAssistida {
  lancamentos: readonly LancamentoNovo[];
  sequenciaDias: number;
}

export function lancamentosDaAssistida(
  aulaId: AulaId,
  dia: DiaISO,
  diasAntes: ReadonlySet<DiaISO>
): EfeitosDaAssistida {
  const sequenciaDias = sequenciaDiasUteis(new Set(diasAntes).add(dia), dia);
  const lancamentos: LancamentoNovo[] = [
    { aulaId, motivo: "aula_assistida", pontos: PONTOS.aula_assistida },
  ];
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

export interface Conquista {
  bonusSequencia: number | null;
  pontos: number;
  sequenciaDias: number;
}

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

export interface Registro {
  assistida: boolean;
  cobertura: Cobertura;
  /** Só na chamada que criou a aula assistida. */
  conquista: Conquista | null;
  recusadosSeg: number;
  trechos: Trechos;
}
