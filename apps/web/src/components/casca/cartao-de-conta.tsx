"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import type { ResumoAluno } from "@cursos/api/dominio/painel";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@cursos/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@cursos/ui/components/dropdown-menu";
import { cn } from "@cursos/ui/lib/utils";
import { ChevronsUpDown, Flame, LogOut, Star, UserRound } from "lucide-react";
import Link from "next/link";
import { Suspense, use, useCallback, useSyncExternalStore } from "react";

import { fmtPts, iniciais, plural } from "@/lib/formato";
import { anelDosPontos } from "@/lib/player/sinal";

import type { LinkDaArea } from "./nav";
import { useAlternarNavegacao } from "./provedor-da-casca";

/** O que o cartão mostra do resumo, derivado do tipo do domínio. */
export type Placar = Pick<ResumoAluno, "saldo" | "sequenciaDias">;

const apagado = () => false;

const GATILHO = cn(
  "flex w-full items-center gap-2.5 rounded-2xl border border-sidebar-border bg-sidebar p-2 text-left",
  "transition-[border-color,background-color,box-shadow] duration-150 ease-out motion-reduce:transition-none",
  "hover:border-trilho hover:bg-sidebar-accent data-popup-open:border-trilho data-popup-open:bg-sidebar-accent",
  "group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:rounded-full group-data-[collapsible=icon]:p-px"
);

// O anel acende quando a conquista chega no player (anelDosPontos).
const ANEL = "ring-3 ring-sol/35 duration-300";

const ITEM =
  "h-9 gap-2.5 rounded-[9px] px-2.5 font-medium text-[13px] text-sidebar-foreground focus:bg-sidebar-accent focus:text-titulo [&_svg]:text-muted-foreground";

const PLACA =
  "grid gap-0.5 rounded-[10px] bg-sidebar-accent px-2.5 py-2 text-[11px] text-muted-foreground focus:bg-border focus:text-muted-foreground";

const LINHA_ESQUELETO =
  "block animate-pulse rounded bg-muted motion-reduce:animate-none";

function NumerosDoGatilho({ placar }: { placar: Promise<Placar | null> }) {
  const p = use(placar);
  if (!p) {
    return null;
  }
  return (
    <span className="flex gap-2 text-muted-foreground text-xs tabular-nums">
      <span className="inline-flex items-center gap-1 font-semibold text-sol">
        <Star aria-hidden="true" className="size-3" />
        <span className="sr-only">, saldo de </span>
        {fmtPts(p.saldo)}
      </span>
      <span className="inline-flex items-center gap-1">
        <Flame aria-hidden="true" className="size-3 text-canela" />
        <span className="sr-only">, sequência de </span>
        {plural(p.sequenciaDias, "dia", "dias")}
      </span>
    </span>
  );
}

function PlacarDoMenu({ placar }: { placar: Promise<Placar | null> }) {
  const p = use(placar);
  // Em /trocar-pontos o caminho não muda, e só este clique fecha a gaveta.
  const { fecharNoCelular } = useAlternarNavegacao();
  if (!p) {
    return null;
  }
  return (
    <>
      <div className="grid grid-cols-2 gap-1.5 p-1">
        <DropdownMenuItem
          className={PLACA}
          onClick={fecharNoCelular}
          render={<Link href="/trocar-pontos" />}
        >
          Saldo
          <b className="font-semibold text-[15px] text-sol tabular-nums">
            {fmtPts(p.saldo)}
          </b>
        </DropdownMenuItem>
        <DropdownMenuItem
          className={PLACA}
          onClick={fecharNoCelular}
          render={<Link href="/trocar-pontos" />}
        >
          Sequência
          <b className="font-semibold text-[15px] text-titulo tabular-nums">
            {plural(p.sequenciaDias, "dia", "dias")}
          </b>
        </DropdownMenuItem>
      </div>
      <DropdownMenuSeparator className="mx-0 my-1" />
    </>
  );
}

/**
 * O cartão de conta do rodapé, igual nas duas áreas. Nome e foto vêm do Clerk no
 * navegador, então a troca feita em "Minha conta" aparece sem refresh. Saldo e
 * sequência vêm da Promise que a Casca cria no servidor: o refresh que toda escrita
 * de pontos já pede traz outra Promise, e os números trocam sem esqueleto.
 */
export function CartaoDeConta({
  outraArea,
  placar,
}: {
  outraArea: LinkDaArea | null;
  placar: Promise<Placar | null>;
}) {
  const { isLoaded, user } = useUser();
  const { openUserProfile, signOut } = useClerk();
  const { fecharNoCelular, recolhida } = useAlternarNavegacao();
  // O modal do Clerk vai para o body, fora da armadilha de foco da gaveta modal:
  // com ela aberta, os campos dele perderiam o foco.
  const abrirMinhaConta = useCallback(() => {
    fecharNoCelular();
    openUserProfile();
  }, [fecharNoCelular, openUserProfile]);
  const sair = useCallback(() => signOut({ redirectUrl: "/" }), [signOut]);
  const aceso = useSyncExternalStore(
    anelDosPontos.assinar,
    anelDosPontos.aceso,
    apagado
  );
  const nome =
    user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "Sua conta";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn(GATILHO, aceso && ANEL)}>
        <Avatar className="size-9 after:hidden">
          {user?.hasImage ? <AvatarImage alt="" src={user.imageUrl} /> : null}
          <AvatarFallback className="bg-canela font-bold text-[13px] text-sobre-cor">
            {isLoaded ? iniciais(nome) : null}
          </AvatarFallback>
        </Avatar>
        <span className="grid min-w-0 flex-1 gap-0.5 leading-tight group-data-[collapsible=icon]:sr-only">
          <span className="sr-only">Conta de </span>
          {isLoaded ? (
            <span className="truncate font-semibold text-sm text-titulo">
              {nome}
            </span>
          ) : (
            <span className={cn(LINHA_ESQUELETO, "h-3.5 w-28")} />
          )}
          <Suspense
            fallback={<span className={cn(LINHA_ESQUELETO, "h-3 w-24")} />}
          >
            <NumerosDoGatilho placar={placar} />
          </Suspense>
        </span>
        <ChevronsUpDown
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={recolhida ? "end" : "start"}
        className={cn(
          "grid gap-0.5 rounded-2xl bg-popover p-1.5 shadow-black/45 shadow-xl ring-border",
          recolhida && "w-58"
        )}
        side={recolhida ? "right" : "top"}
        sideOffset={recolhida ? 14 : 8}
      >
        <Suspense fallback={null}>
          <PlacarDoMenu placar={placar} />
        </Suspense>
        <DropdownMenuItem className={ITEM} onClick={abrirMinhaConta}>
          <UserRound aria-hidden="true" />
          Minha conta
        </DropdownMenuItem>
        {outraArea ? (
          <DropdownMenuItem
            className={ITEM}
            render={<Link href={outraArea.href} />}
          >
            {outraArea.icone}
            {outraArea.nome}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator className="mx-0 my-1" />
        <DropdownMenuItem className={ITEM} onClick={sair}>
          <LogOut aria-hidden="true" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
