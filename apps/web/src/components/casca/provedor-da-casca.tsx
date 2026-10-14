"use client";

import { SidebarProvider, useSidebar } from "@cursos/ui/components/sidebar";
import { usePathname } from "next/navigation";
import {
  type CSSProperties,
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { LARGURAS_DA_SIDEBAR } from "./nav";

/** A transição de largura de index.css dura 200 ms; a folga cobre o último quadro. */
const PRAZO_DA_ANIMACAO_MS = 260;

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
      style={LARGURAS_DA_SIDEBAR as CSSProperties}
    >
      <FecharGavetaAoNavegar />
      <Animar value={setAnimandoDesde}>{children}</Animar>
    </SidebarProvider>
  );
}

/**
 * A gaveta do celular fecha quando o caminho muda, venha o link de onde vier: menu,
 * Continuar, placar. O SidebarProvider fica no layout e sobrevive à navegação dentro
 * da área, e o Sheet do packages/ui não escuta rota.
 */
function FecharGavetaAoNavegar() {
  const caminho = usePathname();
  const { setOpenMobile } = useSidebar();
  const visto = useRef(caminho);
  useEffect(() => {
    if (visto.current !== caminho) {
      visto.current = caminho;
      setOpenMobile(false);
    }
  }, [caminho, setOpenMobile]);
  return null;
}

/** O modo da casca: a gaveta do celular, ou a sidebar recolhida no computador. */
export function useModoDaCasca() {
  const { isMobile, state } = useSidebar();
  return {
    noCelular: isMobile,
    recolhida: state === "collapsed" && !isMobile,
  };
}

/**
 * O único jeito de alternar a navegação com animação: o botão do cabeçalho e o do
 * topo do celular. As duas atualizações caem no mesmo lote do clique, então o
 * atributo e a largura nova chegam no mesmo commit. Fora do ProvedorDaCasca, o hook
 * lança já na renderização, e não no primeiro clique.
 */
export function useAlternarNavegacao() {
  const animar = use(Animar);
  if (!animar) {
    throw new Error("useAlternarNavegacao fora do ProvedorDaCasca.");
  }
  const { setOpenMobile, toggleSidebar } = useSidebar();
  const alternar = useCallback(() => {
    animar(performance.now());
    toggleSidebar();
  }, [animar, toggleSidebar]);
  const fecharNoCelular = useCallback(
    () => setOpenMobile(false),
    [setOpenMobile]
  );
  return { alternar, fecharNoCelular };
}
