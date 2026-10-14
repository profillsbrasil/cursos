"use client";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@cursos/ui/components/sidebar";
import { cn } from "@cursos/ui/lib/utils";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { DICA, DICA_SECUNDARIA, FOCO } from "./estilo";
import {
  GEOMETRIA_DA_LISTA,
  type ItemDoMenu,
  indiceAtivo,
  movimentoDaPilula,
} from "./nav";
import { useAlternarNavegacao } from "./provedor-da-casca";

// O ícone fica a 11 px da borda do item nos dois modos: recolhida, o item tem 40 px
// e o ícone de 18 px cai no centro sem flex, então nada desliza quando a largura anda.
const ITEM = cn(
  "h-(--altura-do-item) gap-3 rounded-[10px] px-[11px] font-medium text-sidebar-foreground text-sm",
  "transition-[color,background-color] duration-150 ease-out motion-reduce:transition-none",
  "hover:bg-sidebar-accent hover:text-titulo active:bg-sidebar-accent active:text-titulo",
  "[&_svg]:size-[18px] [&_svg]:text-muted-foreground [&_svg]:transition-colors [&_svg]:duration-150 hover:[&_svg]:text-titulo",
  "group-data-[collapsible=icon]:size-(--altura-do-item)! group-data-[collapsible=icon]:p-[11px]!",
  FOCO
);

const ITEM_ATIVO =
  "font-semibold text-sobre-cor hover:bg-transparent hover:text-sobre-cor active:bg-transparent active:text-sobre-cor [&_svg]:text-sobre-cor hover:[&_svg]:text-sobre-cor";

const ITEM_EM_BREVE =
  "cursor-default text-muted-foreground hover:bg-transparent hover:text-muted-foreground active:bg-transparent active:text-muted-foreground aria-disabled:pointer-events-auto aria-disabled:opacity-100 hover:[&_svg]:text-muted-foreground";

export function NavPrincipal({
  itens,
  rotulo,
}: {
  itens: readonly ItemDoMenu[];
  rotulo: string;
}) {
  const ativo = indiceAtivo(usePathname(), itens);
  const reduzir = useReducedMotion() ?? false;
  const movimento = movimentoDaPilula(ativo?.indice ?? null, reduzir);
  const { fecharNoCelular } = useAlternarNavegacao();
  return (
    <nav aria-label={rotulo} style={GEOMETRIA_DA_LISTA}>
      <SidebarMenu className="relative gap-(--vao-do-item)">
        {movimento && (
          <motion.li
            animate={{ transform: movimento.transform }}
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-0 h-(--altura-do-item) w-full rounded-[10px] bg-sidebar-primary group-data-[collapsible=icon]:w-(--altura-do-item)"
            initial={false}
            transition={movimento.transicao}
          />
        )}
        {itens.map(({ icone, ...item }, indice) => {
          if (item.tipo === "em_breve") {
            return (
              <SidebarMenuItem key={item.nome}>
                <SidebarMenuButton
                  aria-disabled="true"
                  className={cn(ITEM, ITEM_EM_BREVE)}
                  tooltip={{
                    children: (
                      <>
                        {item.nome}
                        <span className={DICA_SECUNDARIA}>Em breve</span>
                      </>
                    ),
                    className: DICA,
                  }}
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
          const ariaCurrent =
            ativo?.indice === indice ? ativo.ariaCurrent : undefined;
          return (
            <SidebarMenuItem key={item.nome}>
              <SidebarMenuButton
                aria-current={ariaCurrent}
                className={cn(ITEM, ariaCurrent && ITEM_ATIVO)}
                // A troca de caminho já fecha a gaveta; o toque no item da página
                // atual não troca o caminho e fecha por aqui.
                onClick={fecharNoCelular}
                render={<Link href={item.href} />}
                tooltip={{ children: item.nome, className: DICA }}
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
