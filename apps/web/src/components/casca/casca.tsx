import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
} from "@cursos/ui/components/sidebar";
import { cookies } from "next/headers";
import type { ReactNode } from "react";

import { carregarResumo, paraACasca } from "@/server/api";

import { CabecalhoDaCasca, TopoDoCelular } from "./cabecalho-da-casca";
import { CartaoDeConta, type Placar } from "./cartao-de-conta";
import type { ItemDoMenu, LinkDaArea } from "./nav";
import { NavPrincipal } from "./nav-principal";
import { ProvedorDaCasca } from "./provedor-da-casca";

/** O cookie que o SidebarProvider grava; o nome é constante interna do packages/ui. */
const COOKIE_DA_SIDEBAR = "sidebar_state";

const placarDe = ({ saldo, sequenciaDias }: Placar): Placar => ({
  saldo,
  sequenciaDias,
});

/**
 * A casca das duas áreas: a sidebar (marca e botão de recolher, a navegação com a
 * pílula, o rodapé com o cartão de conta), a gaveta e o topo do celular, e a moldura
 * do conteúdo. A área diz só o que é dela: os itens, o selo, o link para a outra
 * área e a peça extra do rodapé.
 */
export async function Casca({
  children,
  itens,
  outraArea,
  rodape,
  rotulo,
  selo,
}: {
  children: ReactNode;
  itens: readonly ItemDoMenu[];
  /** Obrigatório, para cada área decidir de propósito: null quando não há outra área. */
  outraArea: LinkDaArea | null;
  /** A peça da área acima do cartão de conta: o Continuar no aluno, nada no admin. */
  rodape?: ReactNode;
  /** aria-label da navegação. */
  rotulo: string;
  /** Texto do selo ao lado da marca, como "Admin". */
  selo?: string;
}) {
  const aberta = (await cookies()).get(COOKIE_DA_SIDEBAR)?.value !== "false";
  // Sem await: a casca desenha na hora e o placar chega por streaming.
  const placar = paraACasca("placar", carregarResumo().then(placarDe));
  return (
    <ProvedorDaCasca aberta={aberta}>
      <Sidebar collapsible="icon" variant="sidebar">
        <SidebarHeader className="h-[68px] shrink-0 flex-row items-center gap-2.5 py-0 pr-3 pl-3.5">
          <CabecalhoDaCasca selo={selo} />
        </SidebarHeader>
        <SidebarContent className="px-3.5 py-1.5">
          <NavPrincipal itens={itens} rotulo={rotulo} />
        </SidebarContent>
        <SidebarFooter className="gap-2 p-3.5">
          {rodape}
          <CartaoDeConta outraArea={outraArea} placar={placar} />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <TopoDoCelular />
        <div className="min-w-0 px-[clamp(1rem,4vw,3rem)] pt-8 pb-16">
          {children}
        </div>
      </SidebarInset>
    </ProvedorDaCasca>
  );
}
