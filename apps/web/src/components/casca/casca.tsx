import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
} from "@cursos/ui/components/sidebar";
import { cn } from "@cursos/ui/lib/utils";
import { cookies } from "next/headers";
import type { ReactNode } from "react";

import { BOTAO } from "./botoes";
import { CabecalhoDaCasca, TopoDoCelular } from "./cabecalho-da-casca";
import { CartaoDeConta, type Placar } from "./cartao-de-conta";
import {
  COOKIE_DA_SIDEBAR,
  type ItemDoMenu,
  type LinkDaArea,
  RECUO,
} from "./nav";
import { NavPrincipal } from "./nav-principal";
import { ProvedorDaCasca } from "./provedor-da-casca";

/** O alvo do Pular para o conteúdo: a moldura das páginas, depois do topo do celular. */
const CONTEUDO = "conteudo";

// O botão amarelo fica acima da janela e desce só com o foco de teclado, porque a
// variante hover: também casa com ele (#30); fora da janela, o cursor não o alcança.
// Ele aparece aceso e sem transição: ação de teclado não anima.
const PULAR = cn(
  BOTAO,
  "fixed -top-16 left-3 z-50 transition-none hover:top-3"
);

/**
 * A casca das duas áreas: a sidebar (marca e botão de recolher, a navegação com a
 * pílula, o rodapé com o cartão de conta), a gaveta e o topo do celular, e a moldura
 * do conteúdo. A área diz só o que é dela: os itens, o selo, o link para a outra
 * área, o placar e a peça extra do rodapé.
 */
export async function Casca({
  children,
  itens,
  outraArea,
  placar,
  rodape,
  rotulo,
  selo,
}: {
  children: ReactNode;
  itens: readonly ItemDoMenu[];
  /** Obrigatório, para cada área decidir de propósito: null quando não há outra área. */
  outraArea: LinkDaArea | null;
  /** Saldo e sequência do cartão de conta, por streaming; null no admin, que não tem placar. */
  placar: Promise<Placar | null> | null;
  /** A peça da área acima do cartão de conta: o Continuar no aluno, nada no admin. */
  rodape?: ReactNode;
  /** aria-label da navegação. */
  rotulo: string;
  /** Texto do selo ao lado da marca, como "Admin". */
  selo?: string;
}) {
  const aberta = (await cookies()).get(COOKIE_DA_SIDEBAR)?.value !== "false";
  return (
    <ProvedorDaCasca aberta={aberta}>
      <a className={PULAR} href={`#${CONTEUDO}`}>
        Pular para o conteúdo
      </a>
      <Sidebar collapsible="icon" variant="sidebar">
        <SidebarHeader
          className="h-[68px] shrink-0 flex-row items-center gap-2.5 py-0 pr-3"
          style={{ paddingLeft: RECUO }}
        >
          <CabecalhoDaCasca selo={selo} />
        </SidebarHeader>
        <SidebarContent className="py-1.5" style={{ paddingInline: RECUO }}>
          <NavPrincipal itens={itens} rotulo={rotulo} />
        </SidebarContent>
        <SidebarFooter className="gap-2" style={{ padding: RECUO }}>
          {rodape}
          <CartaoDeConta outraArea={outraArea} placar={placar} />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <TopoDoCelular selo={selo} />
        <div
          className="min-w-0 px-[clamp(1rem,4vw,3rem)] pt-8 pb-16"
          id={CONTEUDO}
          tabIndex={-1}
        >
          {children}
        </div>
      </SidebarInset>
    </ProvedorDaCasca>
  );
}
