"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@cursos/ui/components/tooltip";
import { cn } from "@cursos/ui/lib/utils";
import { Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import Image from "next/image";

import { ICONE, LOCKUP, PRODUTO } from "@/lib/marca";

import { DICA, DICA_SECUNDARIA, FOCO } from "./estilo";
import { useAlternarNavegacao } from "./provedor-da-casca";

const BOTAO_DE_ICONE = cn(
  "grid size-8 shrink-0 place-items-center rounded-[9px] text-muted-foreground",
  "transition-[color,background-color] duration-150 ease-out hover:bg-sidebar-accent hover:text-titulo motion-reduce:transition-none",
  "[&_svg]:size-[18px]",
  FOCO
);

function Atalho() {
  return <span className={DICA_SECUNDARIA}>Ctrl B</span>;
}

/**
 * Aberta: o lockup, o selo da área e o botão de recolher. Recolhida: um botão de
 * 40 px com o ícone da marca, que vira "Abrir" com hover ou foco (sempre, em tela
 * sem hover). No celular: o lockup e o botão de fechar a gaveta. As duas formas
 * do computador saem no HTML, e o modo da sidebar esconde uma delas por CSS.
 */
export function CabecalhoDaCasca({ selo }: { selo?: string }) {
  const { alternar, fecharNoCelular, noCelular, recolhida } =
    useAlternarNavegacao();
  return (
    <>
      {/* O selo da área ocupa o vão à direita de CURSOS, na segunda linha do lockup:
          ao lado dele, o lockup, o selo e o botão não cabem nos 220 px. */}
      <div className="relative shrink-0 group-data-[collapsible=icon]:hidden">
        <Image
          alt={PRODUTO}
          className="h-10 w-auto"
          height={LOCKUP.altura}
          preload
          src={LOCKUP.src}
          width={LOCKUP.largura}
        />
        {selo ? (
          <span className="absolute top-[19px] left-[115px] rounded-full bg-ceu/14 px-1.5 py-[3px] font-semibold text-[10px] text-ceu uppercase leading-none tracking-wide">
            {selo}
          </span>
        ) : null}
      </div>
      {noCelular ? (
        <button
          aria-label="Fechar navegação"
          className={cn(BOTAO_DE_ICONE, "ml-auto")}
          onClick={fecharNoCelular}
          type="button"
        >
          <X aria-hidden="true" />
        </button>
      ) : (
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                aria-expanded={true}
                aria-label="Recolher navegação"
                className={cn(
                  BOTAO_DE_ICONE,
                  "ml-auto group-data-[collapsible=icon]:hidden"
                )}
                onClick={alternar}
                type="button"
              />
            }
          >
            <PanelLeftClose aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent className={DICA} hidden={recolhida} side="bottom">
            Recolher <Atalho />
          </TooltipContent>
        </Tooltip>
      )}
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              aria-expanded={false}
              aria-label="Abrir navegação"
              className={cn(
                "group/abrir relative hidden size-10 shrink-0 place-items-center rounded-[10px] text-titulo group-data-[collapsible=icon]:grid",
                "transition-colors duration-150 ease-out hover:bg-sidebar-accent focus-visible:bg-sidebar-accent motion-reduce:transition-none [@media(hover:none)]:bg-sidebar-accent",
                FOCO
              )}
              onClick={alternar}
              type="button"
            />
          }
        >
          <Image
            alt=""
            className="size-10 transition-opacity duration-150 ease-out group-hover/abrir:opacity-0 group-focus-visible/abrir:opacity-0 motion-reduce:transition-none [@media(hover:none)]:opacity-0"
            height={ICONE.altura}
            src={ICONE.src}
            width={ICONE.largura}
          />
          <PanelLeftOpen
            aria-hidden="true"
            className="absolute size-[18px] opacity-0 transition-opacity duration-150 ease-out group-hover/abrir:opacity-100 group-focus-visible/abrir:opacity-100 motion-reduce:transition-none [@media(hover:none)]:opacity-100"
          />
        </TooltipTrigger>
        <TooltipContent className={DICA} hidden={!recolhida} side="right">
          Abrir <Atalho />
        </TooltipContent>
      </Tooltip>
    </>
  );
}

/**
 * A faixa do topo do conteúdo abaixo de 768 px: o botão que abre a gaveta e o
 * ícone da marca. As páginas não sabem dela; o topo de cada página vem abaixo.
 */
export function TopoDoCelular() {
  const { alternar } = useAlternarNavegacao();
  return (
    <div className="flex h-14 items-center gap-2 border-border border-b bg-background px-3 md:hidden">
      <button
        aria-label="Abrir navegação"
        className={cn(BOTAO_DE_ICONE, "size-10")}
        onClick={alternar}
        type="button"
      >
        <Menu aria-hidden="true" />
      </button>
      <Image
        alt={PRODUTO}
        className="size-[30px]"
        height={ICONE.altura}
        src={ICONE.src}
        width={ICONE.largura}
      />
    </div>
  );
}
