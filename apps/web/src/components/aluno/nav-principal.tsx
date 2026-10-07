"use client";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@cursos/ui/components/sidebar";
import { Award, BookOpen, Gift, House, Megaphone } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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

export function NavPrincipal() {
  const caminho = usePathname();
  const ativo =
    caminho === "/meus-cursos" ||
    caminho.startsWith("/meus-cursos/") ||
    caminho.startsWith("/cursos/");
  const [inicio, ...resto] = EM_BREVE;
  return (
    <SidebarMenu className="gap-1">
      <ItemEmBreve {...inicio} />
      <SidebarMenuItem>
        <SidebarMenuButton
          aria-current={ativo ? "page" : undefined}
          className={`${ITEM} data-active:bg-sidebar-primary data-active:font-semibold data-active:text-sidebar-primary-foreground`}
          isActive={ativo}
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
  );
}
