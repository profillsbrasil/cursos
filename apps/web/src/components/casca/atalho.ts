/** O que o navegador diz da plataforma; o `userAgentData` só existe no Chromium. */
export interface Plataforma {
  platform?: string;
  userAgentData?: { platform?: string };
}

const APPLE = /mac|iphone|ipad|ipod/i;

/** O servidor não sabe a plataforma: escreve o atalho do Linux e do Windows. */
export const ATALHO_NO_SERVIDOR = "Ctrl B";

/**
 * O atalho de alternar a sidebar como a pessoa o digita. O `sidebar.tsx` aceita
 * Ctrl ou Command com B, e no Mac quem usa o teclado aperta o Command.
 */
export function atalhoDe(navegador: Plataforma): string {
  const nome = navegador.userAgentData?.platform || navegador.platform || "";
  return APPLE.test(nome) ? "⌘ B" : ATALHO_NO_SERVIDOR;
}
