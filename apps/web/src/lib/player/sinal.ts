/** Quanto tempo o aviso "Aula assistida" e o anel do cartão de conta ficam à vista (protótipo). */
export const AVISO_MS = 5200;
export const ANEL_MS = 1400;

export type Agendar = (fn: () => void, ms: number) => () => void;

export const agendarNoNavegador: Agendar = (fn, ms) => {
  const id = setTimeout(fn, ms);
  return () => clearTimeout(id);
};

/** Um sinal aceso por `ms`: acender de novo reinicia a contagem. */
export function criarSinal(agendar: Agendar, ms: number) {
  let aceso = false;
  let apagar: (() => void) | null = null;
  const ouvintes = new Set<() => void>();
  const mudar = (valor: boolean) => {
    aceso = valor;
    for (const ouvir of ouvintes) {
      ouvir();
    }
  };
  return {
    acender() {
      apagar?.();
      apagar = agendar(() => {
        apagar = null;
        mudar(false);
      }, ms);
      mudar(true);
    },
    aceso: () => aceso,
    assinar(ouvir: () => void) {
      ouvintes.add(ouvir);
      return () => {
        ouvintes.delete(ouvir);
      };
    },
    encerrar() {
      apagar?.();
      apagar = null;
      aceso = false;
    },
  };
}

export type Sinal = ReturnType<typeof criarSinal>;

/** O cartão de conta da sidebar acende quando a conquista chega. */
export const anelDosPontos = criarSinal(agendarNoNavegador, ANEL_MS);
