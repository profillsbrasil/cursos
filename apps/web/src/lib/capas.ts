// Dimensões reais das capas em public/capas, para o next/image reservar o espaço certo.
// Capa nova sem entrada aqui cai em 16:9.
const DIMENSOES: Record<string, { height: number; width: number }> = {
  "/capas/autoavaliacao.jpg": { height: 437, width: 900 },
  "/capas/bpf.jpg": { height: 720, width: 1280 },
  "/capas/calibracao.jpg": { height: 720, width: 1280 },
  "/capas/comercial.jpg": { height: 604, width: 900 },
  "/capas/fundamentos.jpg": { height: 720, width: 1280 },
  "/capas/gravacao.jpg": { height: 507, width: 900 },
  "/capas/limpeza.jpg": { height: 720, width: 1280 },
  "/capas/nova-rotina.jpg": { height: 604, width: 900 },
  "/capas/operacao.jpg": { height: 720, width: 1280 },
  "/capas/portfolio.jpg": { height: 720, width: 1280 },
  "/capas/pos-venda.jpg": { height: 720, width: 1280 },
  "/capas/seguranca.jpg": { height: 720, width: 1280 },
};

export const dimensoesDaCapa = (url: string) =>
  DIMENSOES[url] ?? { height: 720, width: 1280 };
