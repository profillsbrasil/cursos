"use client";

import { SidebarMenu, SidebarMenuItem } from "@cursos/ui/components/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@cursos/ui/components/tooltip";
import { cn } from "@cursos/ui/lib/utils";
import { domAnimation, LazyMotion, m, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactElement, ReactNode } from "react";

import { DICA, DICA_SECUNDARIA } from "./estilo";
import {
  GEOMETRIA_DA_LISTA,
  type ItemDoMenu,
  indiceAtivo,
  movimentoDaPilula,
} from "./nav";
import { useAlternarNavegacao, useModoDaCasca } from "./provedor-da-casca";

const ITEM = cn(
  "flex h-(--altura-do-item) w-full items-center gap-3 overflow-hidden rounded-[10px] px-[11px] py-2 text-left",
  "transition-[color,background-color] duration-150",
  "[&_svg]:size-[18px] [&_svg]:shrink-0 [&_svg]:transition-colors [&_svg]:duration-150 [&>span:last-child]:truncate",
  "group-data-[collapsible=icon]:size-(--altura-do-item) group-data-[collapsible=icon]:p-[11px]"
);

type EstadoDoItem = "link" | "ativo" | "em_breve";

const POR_ESTADO: Record<EstadoDoItem, string> = {
  ativo: "font-semibold text-sobre-cor [&_svg]:text-sobre-cor",
  em_breve:
    "cursor-default font-medium text-muted-foreground hover:text-foreground [&_svg]:text-muted-foreground hover:[&_svg]:text-foreground",
  link: "font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-titulo active:bg-sidebar-accent active:text-titulo [&_svg]:text-muted-foreground hover:[&_svg]:text-titulo",
};

function ItemDaNav({
  children,
  dica,
  estado,
  render,
}: {
  children: ReactNode;
  dica: ReactNode;
  estado: EstadoDoItem;
  render: ReactElement;
}) {
  const { recolhida } = useModoDaCasca();

  return (
    <Tooltip disabled={!recolhida}>
      <TooltipTrigger className={cn(ITEM, POR_ESTADO[estado])} render={render}>
        {children}
      </TooltipTrigger>
      <TooltipContent className={DICA} side="right">
        {dica}
      </TooltipContent>
    </Tooltip>
  );
}

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
          <LazyMotion features={domAnimation} strict>
            <m.li
              animate={{ transform: movimento.transform }}
              aria-hidden="true"
              className="ativo-aceso:bg-sol-hover bg-sidebar-primary ativo-aceso:shadow-brilho pointer-events-none absolute top-0 left-0 h-(--altura-do-item) w-full rounded-[10px] transition-[background-color,box-shadow] duration-150 group-data-[collapsible=icon]:w-(--altura-do-item)"
              initial={false}
              transition={movimento.transicao}
            />
          </LazyMotion>
        )}
        {itens.map(({ icone, ...item }, indice) => {
          if (item.tipo === "em_breve") {
            return (
              <SidebarMenuItem key={item.nome}>
                <ItemDaNav
                  dica={
                    <>
                      {item.nome}
                      <span className={DICA_SECUNDARIA}>Em breve</span>
                    </>
                  }
                  estado="em_breve"
                  render={<button aria-disabled="true" type="button" />}
                >
                  {icone}
                  <span>{item.nome}</span>
                  <span className="text-muted-foreground ml-auto text-xs font-normal">
                    Em breve
                  </span>
                </ItemDaNav>
              </SidebarMenuItem>
            );
          }

          const ariaCurrent =
            ativo?.indice === indice ? ativo.ariaCurrent : undefined;

          return (
            <SidebarMenuItem key={item.nome}>
              <ItemDaNav
                dica={item.nome}
                estado={ariaCurrent ? "ativo" : "link"}
                render={
                  <Link
                    aria-current={ariaCurrent}
                    href={item.href}
                    onClick={fecharNoCelular}
                  />
                }
              >
                {icone}
                <span>{item.nome}</span>
              </ItemDaNav>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </nav>
  );
}
