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
