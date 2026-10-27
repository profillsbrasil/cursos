// A concessão de pontos: o admin dá ou tira pontos de uma pessoa, com o motivo
// escrito. Sem Zod e sem banco: a ficha do admin no navegador lê os tetos daqui.

import type { Pessoa } from "./tipos";

/** O teto de pontos de uma concessão, para dar ou para tirar. */
export const TETO_DA_CONCESSAO = 100_000;

/** O check concessao_de_pontos_motivo_formato repete este teto. */
export const MOTIVO_DA_CONCESSAO_MAX = 200;

/** O texto do extrato do aluno: entrada e saída têm rótulos diferentes. */
export const rotuloDaConcessao = (pontos: number): string =>
  pontos > 0 ? "Pontos do admin" : "Ajuste do admin";

const INTEIRO = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

/**
 * A frase da retirada maior que o saldo, ou null quando a concessão cabe. Dar
 * pontos sempre cabe; tirar nunca deixa o saldo negativo.
 */
export function recusaDaConcessao(
  saldo: number,
  pontos: number
): string | null {
  if (saldo + pontos >= 0) {
    return null;
  }
  if (saldo <= 0) {
    return "A pessoa não tem pontos.";
  }
  return `A pessoa tem só ${INTEIRO.format(saldo)} ${saldo === 1 ? "ponto" : "pontos"}.`;
}

export interface LinhaDaConcessao {
  concedidaEm: Date;
  concedidaPor: string;
  id: string;
  motivo: string;
  pontos: number;
}

/** A concessão como a ficha do admin a mostra: o autor vira o nome no Clerk. */
export interface ConcessaoNaFicha {
  em: Date;
  id: string;
  motivo: string;
  pontos: number;
  /** O nome de quem concedeu, ou o userId quando o Clerk não o conhece mais. */
  por: string;
}

export function montarConcessoes(
  linhas: readonly LinhaDaConcessao[],
  autores: readonly (Pessoa | null)[]
): ConcessaoNaFicha[] {
  const nomes = new Map(
    autores.flatMap((p) => (p ? [[p.userId, p.nome] as const] : []))
  );
  return linhas.map((l) => ({
    em: l.concedidaEm,
    id: l.id,
    motivo: l.motivo,
    pontos: l.pontos,
    por: nomes.get(l.concedidaPor) ?? l.concedidaPor,
  }));
}
