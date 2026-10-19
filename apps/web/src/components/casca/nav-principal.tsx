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

// O ícone fica a 11 px da borda do item nos dois modos: recolhida, o item tem 40 px
// e o ícone de 18 px cai no centro sem flex, então nada desliza quando a largura anda.
// O group-data da recolhida vence a altura, a largura e o padding da aberta pela
// especificidade, e cor e peso só existem por estado: nenhuma classe anula outra.
const ITEM = cn(
  "flex h-(--altura-do-item) w-full items-center gap-3 overflow-hidden rounded-[10px] px-[11px] py-2 text-left text-sm",
  "transition-[color,background-color] duration-150 ease-out",
  "[&>span:last-child]:truncate [&_svg]:size-[18px] [&_svg]:shrink-0 [&_svg]:transition-colors [&_svg]:duration-150",
  "group-data-[collapsible=icon]:size-(--altura-do-item) group-data-[collapsible=icon]:p-[11px]"
);

type EstadoDoItem = "link" | "ativo" | "em_breve";

// Sob o cursor e com o foco de teclado (#44): o link ganha fundo; o ativo não muda,
// porque a pílula amarela atrás dele acende sozinha (ativo-aceso, no index.css); o
// "Em breve" não leva a lugar nenhum, e só o nome e o ícone clareiam, sem fundo.
const POR_ESTADO: Record<EstadoDoItem, string> = {
  ativo: "font-semibold text-sobre-cor [&_svg]:text-sobre-cor",
  em_breve:
    "cursor-default font-medium text-muted-foreground hover:text-foreground [&_svg]:text-muted-foreground hover:[&_svg]:text-foreground",
  link: "font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-titulo active:bg-sidebar-accent active:text-titulo [&_svg]:text-muted-foreground hover:[&_svg]:text-titulo",
};

/** O item com a dica à direita, que só aparece com a sidebar recolhida. */
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
    <Tooltip>
      <TooltipTrigger className={cn(ITEM, POR_ESTADO[estado])} render={render}>
        {children}
      </TooltipTrigger>
      <TooltipContent className={DICA} hidden={!recolhida} side="right">
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
          // O m.li carrega só as animações de domAnimation, não o Motion inteiro; o
          // strict acusa um motion.* que volte para dentro daqui.
          <LazyMotion features={domAnimation} strict>
            <m.li
              animate={{ transform: movimento.transform }}
              aria-hidden="true"
              // O Motion escreve só o transform; a cor e o brilho do link ativo sob o
              // cursor e com o foco vêm do CSS, como no botão amarelo.
              className="pointer-events-none absolute top-0 left-0 h-(--altura-do-item) w-full rounded-[10px] ativo-aceso:bg-sol-hover bg-sidebar-primary ativo-aceso:shadow-brilho transition-[background-color,box-shadow] duration-150 ease-out group-data-[collapsible=icon]:w-(--altura-do-item)"
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
                  <span className="ml-auto font-normal text-muted-foreground text-xs">
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
                    // A troca de caminho já fecha a gaveta; o toque no item da
                    // página atual não troca o caminho e fecha por aqui.
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
