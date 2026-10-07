import type { Comando } from "./sessao";

export type ComandoDoTeclado = Comando | { tipo: "tela_cheia" };

const MAPA: Readonly<Record<string, ComandoDoTeclado>> = {
  " ": { tipo: "alternar" },
  arrowdown: { delta: -10, tipo: "volume" },
  arrowleft: { seg: -5, tipo: "saltar" },
  arrowright: { seg: 5, tipo: "saltar" },
  arrowup: { delta: 10, tipo: "volume" },
  f: { tipo: "tela_cheia" },
  j: { seg: -10, tipo: "saltar" },
  k: { tipo: "alternar" },
  l: { seg: 10, tipo: "saltar" },
  m: { tipo: "mudo" },
};

/** Com Ctrl, Alt ou Meta, a tecla é do browser. */
export function comandoDaTecla(e: {
  altKey: boolean;
  ctrlKey: boolean;
  key: string;
  metaKey: boolean;
}): ComandoDoTeclado | null {
  if (e.altKey || e.ctrlKey || e.metaKey) {
    return null;
  }
  return MAPA[e.key.toLowerCase()] ?? null;
}
