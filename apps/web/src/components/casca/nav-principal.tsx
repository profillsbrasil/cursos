"use client";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@cursos/ui/components/sidebar";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useCallback } from "react";

const ITEM = "h-10 gap-3 rounded-lg px-3 font-medium text-sm";

/** `icone` é o elemento pronto, como `<House />`: atravessa a fronteira do Server Component, e o lucide já põe aria-hidden. */
export type ItemDoMenu = { icone: ReactNode; nome: string } & (
  | {
      tipo: "link";
      href: Route;
      outrosPrefixos: readonly string[];
    }
  | { tipo: "em_breve" }
);

function atual(
  caminho: string,
  href: string,
  outrosPrefixos: readonly string[]
): "page" | "true" | undefined {
  if (caminho === href) {
    return "page";
  }
  const filha = [href, ...outrosPrefixos].some((p) =>
    caminho.startsWith(`${p}/`)
  );
  return filha ? "true" : undefined;
}

/** Menu da sidebar do aluno e do admin. Cada sidebar declara a própria lista. */
export function NavPrincipal({
  itens,
  rotulo,
}: {
  itens: readonly ItemDoMenu[];
  rotulo: string;
}) {
  const caminho = usePathname();
  const { setOpenMobile } = useSidebar();
  // O SidebarProvider fica no layout e persiste entre rotas: o sheet do celular fecha no clique.
  const fecharNoCelular = useCallback(
    () => setOpenMobile(false),
    [setOpenMobile]
  );
  return (
    <nav aria-label={rotulo}>
      <SidebarMenu className="gap-1">
        {itens.map(({ icone, ...item }) => {
          if (item.tipo === "em_breve") {
            return (
              <SidebarMenuItem key={item.nome}>
                <SidebarMenuButton
                  aria-disabled="true"
                  className={`${ITEM} text-muted-foreground aria-disabled:opacity-100`}
                >
                  {icone}
                  <span>{item.nome}</span>
                  <span className="ml-auto font-normal text-muted-foreground text-xs">
                    Em breve
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          }
          const ariaCurrent = atual(caminho, item.href, item.outrosPrefixos);
          return (
            <SidebarMenuItem key={item.nome}>
              <SidebarMenuButton
                aria-current={ariaCurrent}
                className={`${ITEM} data-active:bg-sidebar-primary data-active:font-semibold data-active:text-sidebar-primary-foreground data-active:focus-visible:ring-offset-2 data-active:focus-visible:ring-offset-sidebar`}
                isActive={ariaCurrent !== undefined}
                onClick={fecharNoCelular}
                render={<Link href={item.href} />}
              >
                {icone}
                <span>{item.nome}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </nav>
  );
}
