"use client";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@cursos/ui/components/sidebar";
import { Award, BookOpen, Gift, House, Megaphone } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback } from "react";

const ITEM = "h-10 gap-3 rounded-lg px-3 font-medium text-sm";

// Telas que ainda não existem aparecem desabilitadas, com "Em breve" visível.
const EM_BREVE = [
  { icone: House, nome: "Início" },
  { icone: Gift, nome: "Trocar pontos" },
  { icone: Award, nome: "Conquistas" },
  { icone: Megaphone, nome: "Comunicados" },
] as const;

function ItemEmBreve({ icone: Icone, nome }: (typeof EM_BREVE)[number]) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        aria-disabled="true"
        className={`${ITEM} text-muted-foreground aria-disabled:opacity-100`}
      >
        <Icone aria-hidden="true" />
        <span>{nome}</span>
        <span className="ml-auto font-normal text-muted-foreground text-xs">
          Em breve
        </span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

// "page" só na própria /meus-cursos; nas rotas filhas o item é a seção atual ("true").
function atual(caminho: string): "page" | "true" | undefined {
  if (caminho === "/meus-cursos") {
    return "page";
  }
  const filha =
    caminho.startsWith("/meus-cursos/") || caminho.startsWith("/cursos/");
  return filha ? "true" : undefined;
}

export function NavPrincipal() {
  const caminho = usePathname();
  const { setOpenMobile } = useSidebar();
  // O SidebarProvider fica no layout e persiste entre rotas: o sheet do celular fecha no clique.
  const fecharNoCelular = useCallback(
    () => setOpenMobile(false),
    [setOpenMobile]
  );
  const ariaCurrent = atual(caminho);
  const [inicio, ...resto] = EM_BREVE;
  return (
    <nav aria-label="Navegação principal">
      <SidebarMenu className="gap-1">
        <ItemEmBreve {...inicio} />
        <SidebarMenuItem>
          {/* O anel de foco tem a cor do fundo ativo; o offset na cor da sidebar separa os dois. */}
          <SidebarMenuButton
            aria-current={ariaCurrent}
            className={`${ITEM} data-active:bg-sidebar-primary data-active:font-semibold data-active:text-sidebar-primary-foreground data-active:focus-visible:ring-offset-2 data-active:focus-visible:ring-offset-sidebar`}
            isActive={ariaCurrent !== undefined}
            onClick={fecharNoCelular}
            render={<Link href="/meus-cursos" />}
          >
            <BookOpen aria-hidden="true" />
            <span>Meus cursos</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        {resto.map((item) => (
          <ItemEmBreve key={item.nome} {...item} />
        ))}
      </SidebarMenu>
    </nav>
  );
}
