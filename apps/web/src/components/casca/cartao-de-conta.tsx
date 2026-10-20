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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@cursos/ui/components/tooltip";
import { cn } from "@cursos/ui/lib/utils";
import { ChevronsUpDown, Flame, LogOut, Star, UserRound } from "lucide-react";
import Link from "next/link";
import { Suspense, use, useCallback, useSyncExternalStore } from "react";

import { fmtPts, iniciais, plural } from "@/lib/formato";
import { anelDosPontos } from "@/lib/player/sinal";
import { MINHA_CONTA } from "@/lib/rotas";

import { DICA, DICA_SECUNDARIA } from "./estilo";
import type { LinkDaArea } from "./nav";
import { useAlternarNavegacao, useModoDaCasca } from "./provedor-da-casca";

/** O que o cartão mostra do resumo, derivado do tipo do domínio. */
export type Placar = Pick<ResumoAluno, "saldo" | "sequenciaDias">;

const apagado = () => false;

// Recolhido, o avatar cobre o fundo e a borda de 1 px quase não muda: sob o cursor,
// com o foco e com o menu aberto, acende o anel de 2 px em Céu.
const GATILHO = cn(
  "flex w-full items-center gap-2.5 rounded-2xl border border-sidebar-border bg-sidebar p-2 text-left",
  "transition-[border-color,background-color,box-shadow] duration-150 ease-forte",
  "hover:border-trilho hover:bg-sidebar-accent data-popup-open:border-trilho data-popup-open:bg-sidebar-accent",
  "group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:rounded-full group-data-[collapsible=icon]:p-px",
  "group-data-[collapsible=icon]:data-popup-open:ring-2 group-data-[collapsible=icon]:data-popup-open:ring-ceu group-data-[collapsible=icon]:hover:ring-2 group-data-[collapsible=icon]:hover:ring-ceu"
);

// O anel acende quando a conquista chega no player (anelDosPontos).
const ANEL = "ring-3 ring-sol/35 duration-200";

const ITEM =
  "h-9 gap-2.5 rounded-[9px] px-2.5 font-medium text-[13px] text-sidebar-foreground focus:bg-sidebar-accent focus:text-titulo [&_svg]:text-muted-foreground";

const PLACA =
  "grid gap-0.5 rounded-[10px] bg-sidebar-accent px-2.5 py-2 text-muted-foreground text-xs focus:bg-border focus:text-muted-foreground";

const LINHA_ESQUELETO = "block animate-pulse rounded bg-muted";

// O menu tem p-1.5: a divisória volta os 6 px para ir de uma borda à outra.
const DIVISORIA = "-mx-1.5 my-1";

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
      {/* Zero não é conquista: sem sequência, a chama e o número somem. */}
      {p.sequenciaDias > 0 ? (
        <span className="inline-flex items-center gap-1">
          <Flame aria-hidden="true" className="size-3 text-canela" />
          <span className="sr-only">, sequência de </span>
          {plural(p.sequenciaDias, "dia", "dias")}
        </span>
      ) : null}
    </span>
  );
}

function SaldoDaDica({ placar }: { placar: Promise<Placar | null> }) {
  const p = use(placar);
  return p ? <span className={DICA_SECUNDARIA}>{fmtPts(p.saldo)}</span> : null;
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
      <div
        className={cn("grid gap-1.5 p-1", p.sequenciaDias > 0 && "grid-cols-2")}
      >
        <DropdownMenuItem
          className={PLACA}
          onClick={fecharNoCelular}
          render={<Link href="/trocar-pontos" />}
        >
          Saldo
          <b className="font-semibold text-base text-sol tabular-nums">
            {fmtPts(p.saldo)}
          </b>
        </DropdownMenuItem>
        {/* Sem sequência, a placa do saldo ocupa a linha inteira. */}
        {p.sequenciaDias > 0 ? (
          <DropdownMenuItem
            className={PLACA}
            onClick={fecharNoCelular}
            render={<Link href="/trocar-pontos" />}
          >
            Sequência
            <b className="font-semibold text-base text-titulo tabular-nums">
              {plural(p.sequenciaDias, "dia", "dias")}
            </b>
          </DropdownMenuItem>
        ) : null}
      </div>
      <DropdownMenuSeparator className={DIVISORIA} />
    </>
  );
}

export function CartaoDeConta({
  outraArea,
  placar,
}: {
  outraArea: LinkDaArea | null;
  placar: Promise<Placar | null> | null;
}) {
  const { isLoaded, user } = useUser();
  const { signOut } = useClerk();
  const { fecharNoCelular } = useAlternarNavegacao();
  const { recolhida } = useModoDaCasca();
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
      <Tooltip disabled={!recolhida}>
        <DropdownMenuTrigger
          className={cn(GATILHO, aceso && ANEL)}
          render={<TooltipTrigger />}
        >
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
            {placar ? (
              <Suspense
                fallback={<span className={cn(LINHA_ESQUELETO, "h-3 w-24")} />}
              >
                <NumerosDoGatilho placar={placar} />
              </Suspense>
            ) : null}
          </span>
          <ChevronsUpDown
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden"
          />
        </DropdownMenuTrigger>
        <TooltipContent className={DICA} side="right">
          {nome}
          {placar ? (
            <Suspense fallback={null}>
              <SaldoDaDica placar={placar} />
            </Suspense>
          ) : null}
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        align={recolhida ? "end" : "start"}
        className={cn(
          "grid gap-0.5 rounded-2xl bg-popover p-1.5 shadow-black/45 shadow-xl ring-border",
          recolhida && "w-58"
        )}
        side={recolhida ? "right" : "top"}
        sideOffset={recolhida ? 14 : 8}
      >
        {placar ? (
          <Suspense fallback={null}>
            <PlacarDoMenu placar={placar} />
          </Suspense>
        ) : null}
        <DropdownMenuItem
          className={ITEM}
          onClick={fecharNoCelular}
          render={<Link href={MINHA_CONTA} />}
        >
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
        <DropdownMenuSeparator className={DIVISORIA} />
        <DropdownMenuItem className={ITEM} onClick={sair}>
          <LogOut aria-hidden="true" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
