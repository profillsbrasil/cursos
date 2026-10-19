import type { Comando } from "./sessao";

/** A tela cheia e a lista de atalhos são da tela, não da sessão. */
export type ComandoDoTeclado =
  | Comando
  | { tipo: "tela_cheia" }
  | { tipo: "atalhos" };

const MAPA: Readonly<Record<string, ComandoDoTeclado>> = {
  " ": { tipo: "alternar" },
  "?": { tipo: "atalhos" },
  arrowdown: { delta: -10, tipo: "volume" },
  arrowleft: { seg: -5, tipo: "saltar" },
  arrowright: { seg: 5, tipo: "saltar" },
  arrowup: { delta: 10, tipo: "volume" },
  c: { tipo: "legenda" },
  f: { tipo: "tela_cheia" },
  j: { seg: -10, tipo: "saltar" },
  k: { tipo: "alternar" },
  l: { seg: 10, tipo: "saltar" },
  m: { tipo: "mudo" },
};

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
