import type { Route } from "next";
import type { CSSProperties, ReactNode } from "react";

/** `icone` é o elemento pronto, como `<House />`: atravessa a fronteira do Server Component, e o lucide já põe aria-hidden. */
export type ItemDoMenu = { icone: ReactNode; nome: string } & (
  | { tipo: "link"; href: Route; outrosPrefixos: readonly string[] }
  | { tipo: "em_breve" }
);

/** O item do menu da conta que leva à outra área: "Área do admin" no aluno, "Ver como aluno" no admin. */
export interface LinkDaArea {
  href: Route;
  icone: ReactNode;
  nome: string;
}

export interface ItemAtivo {
  ariaCurrent: "page" | "true";
  indice: number;
}

/**
 * O item do caminho: igual ao href ("page"), ou rota filha do href ou de um dos
 * outrosPrefixos ("true"). Item em breve nunca é ativo. A lista real (aria-current)
 * e a pílula leem o mesmo índice.
 */
export function indiceAtivo(
  caminho: string,
  itens: readonly ItemDoMenu[]
): ItemAtivo | null {
  for (const [indice, item] of itens.entries()) {
    if (item.tipo === "em_breve") {
      continue;
    }
    if (caminho === item.href) {
      return { ariaCurrent: "page", indice };
    }
    if (
      [item.href, ...item.outrosPrefixos].some((p) =>
        caminho.startsWith(`${p}/`)
      )
    ) {
      return { ariaCurrent: "true", indice };
    }
  }
  return null;
}

/** Da borda da sidebar ao conteúdo, nos dois modos; casca.tsx aplica no cabeçalho, na lista e no rodapé. */
export const RECUO = 14;
/** O quadrado recolhido: o item, o botão do cabeçalho, o Continuar e o cartão de conta. */
const LADO = 40;
/** O border-r do sidebar-container, que fica dentro da largura (border-box). */
const BORDA = 1;

export const LARGURAS_DA_SIDEBAR = {
  "--sidebar-width": "15.5rem",
  "--sidebar-width-icon": `${RECUO + LADO + RECUO + BORDA}px`,
};

const ALTURA_DO_ITEM = LADO;
const VAO_DO_ITEM = 4;
const PASSO = ALTURA_DO_ITEM + VAO_DO_ITEM;

/** A altura do item e o vão da lista saem daqui para as classes, e o passo da pílula, dos mesmos números. */
export const GEOMETRIA_DA_LISTA = {
  "--altura-do-item": `${ALTURA_DO_ITEM}px`,
  "--vao-do-item": `${VAO_DO_ITEM}px`,
} as CSSProperties;

const CURVA_FORTE: [number, number, number, number] = [0.23, 1, 0.32, 1];
const DESLIZE_S = 0.18;

export interface MovimentoDaPilula {
  transform: string;
  transicao: { duration: number; ease: [number, number, number, number] };
}

/**
 * Para onde a pílula vai e como. Desliza entre dois itens e salta com movimento
 * reduzido. Quando ela acabou de aparecer, o initial={false} do motion.li já a põe
 * no lugar sem animar. null: nenhum item ativo, e a pílula não é desenhada.
 */
export function movimentoDaPilula(
  atual: number | null,
  reduzir: boolean
): MovimentoDaPilula | null {
  if (atual === null) {
    return null;
  }
  return {
    transform: `translateY(${atual * PASSO}px)`,
    transicao: { duration: reduzir ? 0 : DESLIZE_S, ease: CURVA_FORTE },
  };
}
