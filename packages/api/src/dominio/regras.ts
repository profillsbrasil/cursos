// Tabela do PRODUCT.md. O admin passa a ajustar no PR da tela dele, que traz regra_ponto.
export const PONTOS = {
  aula_assistida: 10,
  curso_concluido: 100,
  prova_aprovada: 50,
  quiz_acerto: 5,
  sequencia_7_dias: 30,
  trilha_concluida: 500,
} as const;

export const META_SEQUENCIA = 7;

/** A aula vira assistida quando a cobertura chega a este percentual da duração. */
export const PCT_AULA_ASSISTIDA = 90;

/** As velocidades que o player oferece. A cota deriva o teto delas. */
export const VELOCIDADES = [0.75, 1, 1.25, 1.5, 1.75, 2] as const;
export type Velocidade = (typeof VELOCIDADES)[number];

export const COTA_VIDEO = {
  /** Cobre um envio atrasado de aba em segundo plano (até 60 s a 2x). */
  tetoSeg: 180,
  velocidadeMaxima: Math.max(...VELOCIDADES),
} as const;

/** Posição salva a menos disto do fim abre a aula no segundo 0. */
export const FIM_DA_AULA_SEG = 10;
