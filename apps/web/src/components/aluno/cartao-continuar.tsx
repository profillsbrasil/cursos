"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@cursos/ui/components/tooltip";
import { cn } from "@cursos/ui/lib/utils";
import { Award, Play } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, use } from "react";

import { DICA, DICA_SECUNDARIA, FOCO } from "@/components/casca/estilo";
import { useAlternarNavegacao } from "@/components/casca/provedor-da-casca";

import { type Continuar, estaAqui } from "./continuar";

const CARTAO = cn(
  "grid gap-2 rounded-[14px] bg-sidebar-accent p-3 text-sidebar-foreground group-data-[collapsible=icon]:hidden",
  "transition-colors duration-150 ease-out motion-reduce:transition-none",
  FOCO
);

const BOTAO_REDONDO =
  "grid shrink-0 place-items-center rounded-full bg-sol text-sobre-cor [&_svg]:fill-current";

// Recolhida, o cartão vira o botão redondo de 40 px, preso à esquerda como os itens.
const SOLTO = cn(
  BOTAO_REDONDO,
  "hidden size-10 group-data-[collapsible=icon]:grid [&_svg]:size-4",
  FOCO
);

function Icone({ tipo }: { tipo: Continuar["tipo"] }) {
  return tipo === "prova" ? (
    <Award aria-hidden="true" />
  ) : (
    <Play aria-hidden="true" />
  );
}

function ConteudoDoCartao({ aqui, c }: { aqui: boolean; c: Continuar }) {
  return (
    <>
      <span className="flex items-center gap-2.5">
        <span className={cn(BOTAO_REDONDO, "size-8 [&_svg]:size-3.5")}>
          <Icone tipo={c.tipo} />
        </span>
        <span className="grid min-w-0 leading-tight">
          <b className="truncate font-semibold text-[13px] text-titulo">
            {c.titulo}
          </b>
          <span className="text-muted-foreground text-xs">
            {aqui ? c.chamadaAqui : c.chamada}
          </span>
        </span>
      </span>
      {c.pct === null ? null : (
        <span
          aria-hidden="true"
          className="h-1 overflow-hidden rounded-full bg-trilho"
        >
          <span
            className="block h-full rounded-full bg-sol"
            style={{ width: `${c.pct}%` }}
          />
        </span>
      )}
    </>
  );
}

function Cartao({ cartao }: { cartao: Promise<Continuar | null> }) {
  const caminho = usePathname();
  const { recolhida } = useAlternarNavegacao();
  const c = use(cartao);
  if (!c) {
    return null;
  }
  const aqui = estaAqui(c, caminho);
  const dica = aqui ? c.chamadaAqui : c.chamada;
  return (
    <>
      {aqui ? (
        <div aria-current="page" className={CARTAO}>
          <ConteudoDoCartao aqui c={c} />
        </div>
      ) : (
        <Link
          aria-label={c.rotulo}
          className={cn(CARTAO, "hover:bg-muted")}
          href={c.href}
        >
          <ConteudoDoCartao aqui={false} c={c} />
        </Link>
      )}
      <Tooltip>
        <TooltipTrigger
          render={
            aqui ? (
              <div aria-current="page" className={SOLTO} />
            ) : (
              <Link aria-label={c.rotulo} className={SOLTO} href={c.href} />
            )
          }
        >
          <Icone tipo={c.tipo} />
          {aqui ? (
            <span className="sr-only">
              {c.chamadaAqui}: {c.titulo}
            </span>
          ) : null}
        </TooltipTrigger>
        <TooltipContent className={DICA} hidden={!recolhida} side="right">
          {dica}
          <span className={DICA_SECUNDARIA}>{c.titulo}</span>
        </TooltipContent>
      </Tooltip>
    </>
  );
}

function Esqueleto() {
  return (
    <div
      aria-hidden="true"
      className="h-[66px] animate-pulse rounded-[14px] bg-sidebar-accent group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:rounded-full motion-reduce:animate-none"
    />
  );
}

/**
 * O "Continuar" do rodapé da sidebar do aluno. `cartao` é uma Promise criada no
 * layout; null quer dizer sem retomada, ou o painel falhou e foi ao log. O cartão
 * não busca nada: só o layout renderizado de novo (refresh) traz outro.
 */
export function CartaoContinuar({
  cartao,
}: {
  cartao: Promise<Continuar | null>;
}) {
  return (
    <Suspense fallback={<Esqueleto />}>
      <Cartao cartao={cartao} />
    </Suspense>
  );
}
