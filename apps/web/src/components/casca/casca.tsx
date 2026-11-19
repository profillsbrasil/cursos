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

const ALVO_DO_PULAR_PARA_O_CONTEUDO = "conteudo";

const PULAR = cn(
  BOTAO,
  "fixed -top-16 left-3 z-50 transition-none hover:top-3"
);

interface PartesDaCasca {
  children: ReactNode;
  itens: readonly ItemDoMenu[];
  /** A peça da área acima do cartão de conta: o Continuar no aluno, nada no admin. */
  rodape?: ReactNode;
  /** aria-label da navegação. */
  rotulo: string;
  /** Texto do selo ao lado da marca, como "Admin". */
  selo?: string;
}

/**
 * A casca das duas áreas: a sidebar (marca e botão de recolher, a navegação com a
 * pílula, o rodapé com o cartão de conta), a gaveta e o topo do celular, e a moldura
 * do conteúdo. A área diz só o que é dela: os itens, o selo, o link para a outra
 * área, o placar e a peça extra do rodapé.
 */
export async function Casca({
  outraArea,
  placar,
  ...partes
}: PartesDaCasca & {
  /** Obrigatório, para cada área decidir de propósito: null quando não há outra área. */
  outraArea: LinkDaArea | null;
  /** Saldo e sequência do cartão de conta, por streaming; null no admin, que não tem placar. */
  placar: Promise<Placar | null> | null;
}) {
  const aberta = (await cookies()).get(COOKIE_DA_SIDEBAR)?.value !== "false";

  return (
    <MolduraDaCasca
      {...partes}
      aberta={aberta}
      conta={<CartaoDeConta outraArea={outraArea} placar={placar} />}
    />
  );
}

/** A casca já com o estado da sidebar e o cartão de conta prontos: a `Casca` os tira do cookie e do Clerk. */
export function MolduraDaCasca({
  aberta,
  children,
  conta,
  itens,
  rodape,
  rotulo,
  selo,
}: PartesDaCasca & { aberta: boolean; conta: ReactNode }) {
  return (
    <ProvedorDaCasca aberta={aberta}>
      <a className={PULAR} href={`#${ALVO_DO_PULAR_PARA_O_CONTEUDO}`}>
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
          {conta}
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <TopoDoCelular selo={selo} />
        <div
          className="min-w-0 px-[clamp(1rem,4vw,3rem)] pt-8 pb-16"
          id={ALVO_DO_PULAR_PARA_O_CONTEUDO}
          tabIndex={-1}
        >
          {children}
        </div>
      </SidebarInset>
    </ProvedorDaCasca>
  );
}
