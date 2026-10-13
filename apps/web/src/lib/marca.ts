/**
 * O nome do produto. É o único literal do nome em apps/web/src: o título de cada
 * página chega pelo `title.template` do layout raiz, e o manifest e o alt da marca
 * leem esta constante. `marca.test.ts` falha se o nome aparecer em outro arquivo.
 */
export const PRODUTO = "Profills Cursos";

/** Imagem raster com a medida intrínseca, para o next/image não pular o layout. */
export interface ImagemDaMarca {
  altura: number;
  largura: number;
  src: `/marca/${string}.png`;
}

/** Pena, livro e PROFILLS / CURSOS: a sidebar aberta. */
export const LOCKUP: ImagemDaMarca = {
  altura: 120,
  largura: 424,
  src: "/marca/profills-cursos.png",
};

/** Pena e livro: a sidebar recolhida e o topo do celular. */
export const ICONE: ImagemDaMarca = {
  altura: 216,
  largura: 216,
  src: "/marca/profills-cursos-icone.png",
};
