/** O lado da medalha das paradas da trilha de aulas, em px. */
export const MEDALHA_DA_TRILHA = 56;

/** Um ponto da trilha: `porcento` da largura menos `recuoPx`. */
export interface PontoNaTrilha {
  porcento: number;
  recuoPx: number;
}

/**
 * Onde fica quem assistiu `feitas` aulas. As paradas dividem a trilha em terços
 * iguais, com a medalha no fim de cada um, e o ponto anda em linha reta entre o
 * centro de uma medalha e o da seguinte. No primeiro trecho ele parte da borda
 * esquerda, então o recuo cresce de 0 até meia medalha.
 */
export function pontoNaTrilha(
  feitas: number,
  metas: readonly number[]
): PontoNaTrilha {
  const meia = MEDALHA_DA_TRILHA / 2;
  let antes = 0;
  for (const [i, meta] of metas.entries()) {
    if (feitas <= meta) {
      const t = (Math.max(feitas, 0) - antes) / (meta - antes);
      return {
        porcento: ((i + t) / metas.length) * 100,
        recuoPx: i === 0 ? meia * t : meia,
      };
    }
    antes = meta;
  }
  return { porcento: 100, recuoPx: meia };
}

/**
 * Nos primeiros 6% da trilha, a pílula centrada no ponto passaria da borda do
 * cartão no celular; ali ela se alinha pelo começo, perto do ponto.
 */
export const naPontaEsquerda = ({ porcento }: PontoNaTrilha) => porcento < 6;

export const cssDoPonto = ({ porcento, recuoPx }: PontoNaTrilha) =>
  `calc(${porcento}% - ${recuoPx}px)`;

/**
 * Até 4 cursos, uma coluna por curso. Acima, 4 colunas, ou 3 quando 4 deixariam
 * um cartão sozinho na última linha (5 cursos viram 3 e 2; 9 viram 3, 3 e 3).
 */
export function colunasDosCertificados(n: number): number {
  if (n <= 4) {
    return Math.max(n, 1);
  }
  return n % 4 === 1 ? 3 : 4;
}
