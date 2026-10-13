"use client";

import { SidebarProvider, useSidebar } from "@cursos/ui/components/sidebar";
import {
  type CSSProperties,
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useState,
} from "react";

/** A transição de largura de index.css dura 200 ms; a folga cobre o último quadro. */
const PRAZO_DA_ANIMACAO_MS = 260;

const LARGURAS = {
  "--sidebar-width": "15.5rem",
  // 68 px: o conteúdo recolhido tem 40 px, com 14 px de cada lado.
  "--sidebar-width-icon": "4.25rem",
} as CSSProperties;

const Animar = createContext<((desde: number) => void) | null>(null);

/**
 * O SidebarProvider do packages/ui, mais o atributo data-animando no wrapper. A
 * largura muda na hora por padrão; só useAlternarNavegacao liga o atributo, e o CSS
 * de index.css só anima com ele. O prazo apaga o atributo, e não o transitionend:
 * com movimento reduzido a transição não roda, o evento não chega, e o atributo
 * ficaria preso, fazendo o próximo Ctrl+B animar.
 */
export function ProvedorDaCasca({
  aberta,
  children,
}: {
  aberta: boolean;
  children: ReactNode;
}) {
  const [animandoDesde, setAnimandoDesde] = useState<number | null>(null);
  useEffect(() => {
    if (animandoDesde === null) {
      return;
    }
    const id = window.setTimeout(
      () => setAnimandoDesde(null),
      PRAZO_DA_ANIMACAO_MS
    );
    return () => window.clearTimeout(id);
  }, [animandoDesde]);
  return (
    <SidebarProvider
      data-animando={animandoDesde === null ? undefined : ""}
      defaultOpen={aberta}
      style={LARGURAS}
    >
      <Animar value={setAnimandoDesde}>{children}</Animar>
    </SidebarProvider>
  );
}

/**
 * O único jeito de alternar a navegação com animação: o botão do cabeçalho e o do
 * topo do celular. As duas atualizações caem no mesmo lote do clique, então o
 * atributo e a largura nova chegam no mesmo commit.
 */
export function useAlternarNavegacao() {
  const animar = use(Animar);
  const { isMobile, setOpenMobile, state, toggleSidebar } = useSidebar();
  const alternar = useCallback(() => {
    if (!animar) {
      throw new Error("useAlternarNavegacao fora do ProvedorDaCasca.");
    }
    animar(performance.now());
    toggleSidebar();
  }, [animar, toggleSidebar]);
  const fecharNoCelular = useCallback(
    () => setOpenMobile(false),
    [setOpenMobile]
  );
  return {
    alternar,
    fecharNoCelular,
    noCelular: isMobile,
    recolhida: state === "collapsed" && !isMobile,
  };
}
