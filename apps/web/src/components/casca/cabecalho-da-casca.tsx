"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@cursos/ui/components/tooltip";
import { cn } from "@cursos/ui/lib/utils";
import { Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import Image from "next/image";
import { useSyncExternalStore } from "react";

import { ICONE, LOCKUP, PRODUTO } from "@/lib/marca";

import { ATALHO_NO_SERVIDOR, atalhoDe } from "./atalho";
import { DICA, DICA_SECUNDARIA } from "./estilo";
import { useAlternarNavegacao } from "./provedor-da-casca";

// O hover vale também no foco de teclado (#30): o fundo acende nos dois.
const BOTAO_DE_ICONE = cn(
  "grid size-8 shrink-0 place-items-center rounded-[9px] text-muted-foreground",
  "transition-[color,background-color] duration-150 ease-out hover:bg-sidebar-accent hover:text-titulo motion-reduce:transition-none",
  "[&_svg]:size-[18px]"
);

// Recolhido, o botão tem 40 px, como os itens, e mostra o ícone da marca.
const ALTERNAR_RECOLHIDA =
  "group/alternar relative size-10 rounded-[10px] text-titulo hover:bg-sidebar-accent [@media(hover:none)]:bg-sidebar-accent";

const SOME_COM_HOVER =
  "transition-opacity duration-150 ease-out motion-reduce:transition-none";

const semInscricao = () => () => undefined;

// O servidor e a hidratação escrevem Ctrl B; o cliente troca para ⌘ B no Mac logo
// depois, sem divergir do HTML do servidor.
function Atalho() {
  const atalho = useSyncExternalStore(
    semInscricao,
    () => atalhoDe(navigator),
    () => ATALHO_NO_SERVIDOR
  );
  return <span className={DICA_SECUNDARIA}>{atalho}</span>;
}

/**
 * Aberta: o lockup, o selo da área e o botão de recolher. Recolhida: o mesmo botão,
 * com 40 px e o ícone da marca, que vira "Abrir" com hover ou foco (sempre, em tela
 * sem hover). É um botão só nos dois modos: ele nunca some, então quem alterna pelo
 * teclado fica com o foco nele. No celular: o lockup e o botão de fechar a gaveta.
 */
export function CabecalhoDaCasca({ selo }: { selo?: string }) {
  const { alternar, fecharNoCelular, noCelular, recolhida } =
    useAlternarNavegacao();
  const acao = recolhida ? "Abrir" : "Recolher";
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
                aria-expanded={!recolhida}
                aria-label={`${acao} navegação`}
                className={cn(
                  BOTAO_DE_ICONE,
                  recolhida ? ALTERNAR_RECOLHIDA : "ml-auto"
                )}
                onClick={alternar}
                type="button"
              />
            }
          >
            {recolhida ? (
              <>
                <Image
                  alt=""
                  className={cn(
                    "size-10 group-hover/alternar:opacity-0 [@media(hover:none)]:opacity-0",
                    SOME_COM_HOVER
                  )}
                  height={ICONE.altura}
                  src={ICONE.src}
                  width={ICONE.largura}
                />
                <PanelLeftOpen
                  aria-hidden="true"
                  className={cn(
                    "absolute opacity-0 group-hover/alternar:opacity-100 [@media(hover:none)]:opacity-100",
                    SOME_COM_HOVER
                  )}
                />
              </>
            ) : (
              <PanelLeftClose aria-hidden="true" />
            )}
          </TooltipTrigger>
          <TooltipContent
            className={DICA}
            side={recolhida ? "right" : "bottom"}
          >
            {acao} <Atalho />
          </TooltipContent>
        </Tooltip>
      )}
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
