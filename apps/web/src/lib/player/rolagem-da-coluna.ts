/** As medidas da coluna do curso e da aula atual dentro dela, em px. */
export interface MedidasDaColuna {
  alturaDaAula: number;
  /** O `scrollHeight` da coluna. */
  alturaDoConteudo: number;
  /** O `clientHeight` da coluna. */
  alturaVisivel: number;
  /** Do topo do conteúdo da coluna ao topo da aula, sem contar a rolagem. */
  topoDaAula: number;
}

/**
 * O `scrollTop` que deixa a aula atual no meio da coluna, preso entre o topo e
 * o fim da lista. `null` quando a coluna não rola sozinha: no celular ela fica
 * no fluxo da página, e quem rola é a página, que nunca se mexe por isto.
 */
export function rolagemDaColuna({
  alturaDaAula,
  alturaDoConteudo,
  alturaVisivel,
  topoDaAula,
}: MedidasDaColuna): number | null {
  const maximo = alturaDoConteudo - alturaVisivel;
  if (maximo <= 0) {
    return null;
  }
  const centro = topoDaAula + alturaDaAula / 2 - alturaVisivel / 2;
  return Math.round(Math.min(Math.max(centro, 0), maximo));
}

/**
 * Rola só a coluna, sem animação, até a aula atual ficar no meio dela. Roda
 * também como script no HTML do servidor, logo depois da coluna, para ela
 * pintar já centrada na carga direta. Por isso o corpo não lê nada de fora
 * dele: a conta chega por `calcular`, e o padrão de `quadros` é literal. No
 * streaming do `loading.tsx` a coluna chega escondida, e a espera vai quadro a
 * quadro (300, uns 5 s a 60 Hz) até o React revelá-la: o
 * `requestAnimationFrame` roda antes da pintura do quadro em que ela aparece.
 */
export function centrarAAulaAtual(
  coluna: HTMLElement,
  calcular: (medidas: MedidasDaColuna) => number | null,
  quadros = 300
): void {
  if (coluna.getClientRects().length === 0) {
    if (quadros > 0) {
      requestAnimationFrame(() =>
        centrarAAulaAtual(coluna, calcular, quadros - 1)
      );
    }
    return;
  }
  const aula = coluna.querySelector<HTMLElement>('[aria-current="page"]');
  if (!aula) {
    return;
  }
  const top = calcular({
    alturaDaAula: aula.offsetHeight,
    alturaDoConteudo: coluna.scrollHeight,
    alturaVisivel: coluna.clientHeight,
    topoDaAula:
      aula.getBoundingClientRect().top -
      coluna.getBoundingClientRect().top -
      coluna.clientTop +
      coluna.scrollTop,
  });
  if (top !== null) {
    coluna.scrollTo({ behavior: "instant", top });
  }
}
