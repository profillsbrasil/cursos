/**
 * O nome do produto. É o único literal do nome em apps/web/src: o título de cada
 * página chega pelo `title.template` do layout raiz, e o manifest e o alt da marca
 * leem esta constante. `marca.test.ts` falha se o nome aparecer em outro arquivo.
 */
export const PRODUTO = "Profills Cursos";

/**
 * O formato do título de toda página. Um layout com `title` em texto zera o template
 * para as páginas abaixo dele, então o layout que tem título próprio repete este.
 */
export const TEMPLATE_DO_TITULO = `%s · ${PRODUTO}`;

/** O título do layout raiz: o nome sozinho na página sem título. */
export const TITULO_DA_RAIZ = {
  default: PRODUTO,
  template: TEMPLATE_DO_TITULO,
};

/**
 * SVG da marca com a medida do `viewBox`, para o next/image não pular o layout.
 * O next/image serve `.svg` sem otimizar, como o arquivo está em `public/marca/`.
 */
export interface ImagemDaMarca {
  altura: number;
  largura: number;
  src: `/marca/${string}.svg`;
}

/** Pena, livro e PROFILLS / CURSOS: a sidebar aberta. */
export const LOCKUP: ImagemDaMarca = {
  altura: 120,
  largura: 424,
  src: "/marca/profills-cursos.svg",
};

/** Pena e livro: a sidebar recolhida e o topo do celular. */
export const ICONE: ImagemDaMarca = {
  altura: 216,
  largura: 216,
  src: "/marca/profills-cursos-icone.svg",
};
