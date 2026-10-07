"use client";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@cursos/ui/components/sidebar";
import type { LucideIcon } from "lucide-react";
import { Award, BookOpen, Gift, House, Megaphone } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback } from "react";

const ITEM = "h-10 gap-3 rounded-lg px-3 font-medium text-sm";

type Item = { icone: LucideIcon; nome: string } & (
  | {
      tipo: "link";
      href: Route;
      secao: readonly string[];
    }
  | { tipo: "em_breve" }
);

const ITENS: readonly Item[] = [
  { icone: House, nome: "Início", tipo: "em_breve" },
  {
    href: "/meus-cursos",
    icone: BookOpen,
    nome: "Meus cursos",
    secao: ["/cursos"],
    tipo: "link",
  },
  {
    href: "/trocar-pontos",
    icone: Gift,
    nome: "Trocar pontos",
    secao: [],
    tipo: "link",
  },
  { icone: Award, nome: "Conquistas", tipo: "em_breve" },
  { icone: Megaphone, nome: "Comunicados", tipo: "em_breve" },
];

function atual(
  caminho: string,
  href: string,
  secao: readonly string[]
): "page" | "true" | undefined {
  if (caminho === href) {
    return "page";
  }
  const filha = [href, ...secao].some((p) => caminho.startsWith(`${p}/`));
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
  return (
    <nav aria-label="Navegação principal">
      <SidebarMenu className="gap-1">
        {ITENS.map(({ icone: Icone, ...item }) => {
          if (item.tipo === "em_breve") {
            return (
              <SidebarMenuItem key={item.nome}>
                <SidebarMenuButton
                  aria-disabled="true"
                  className={`${ITEM} text-muted-foreground aria-disabled:opacity-100`}
                >
                  <Icone aria-hidden="true" />
                  <span>{item.nome}</span>
                  <span className="ml-auto font-normal text-muted-foreground text-xs">
                    Em breve
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          }
          const ariaCurrent = atual(caminho, item.href, item.secao);
          return (
            <SidebarMenuItem key={item.nome}>
              <SidebarMenuButton
                aria-current={ariaCurrent}
                className={`${ITEM} data-active:bg-sidebar-primary data-active:font-semibold data-active:text-sidebar-primary-foreground data-active:focus-visible:ring-offset-2 data-active:focus-visible:ring-offset-sidebar`}
                isActive={ariaCurrent !== undefined}
                onClick={fecharNoCelular}
                render={<Link href={item.href} />}
              >
                <Icone aria-hidden="true" />
                <span>{item.nome}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </nav>
  );
}
