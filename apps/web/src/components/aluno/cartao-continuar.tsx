"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@cursos/ui/components/tooltip";
import { cn } from "@cursos/ui/lib/utils";
import { ListChecks, Play } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, use } from "react";

import { DICA, DICA_SECUNDARIA } from "@/components/casca/estilo";
import { useModoDaCasca } from "@/components/casca/provedor-da-casca";

import { type Continuar, estaAqui } from "./continuar";

const CARTAO = cn(
  "bg-sidebar-accent text-sidebar-foreground relative isolate grid gap-2 rounded-[14px] p-3",
  "group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:place-items-center group-data-[collapsible=icon]:rounded-full group-data-[collapsible=icon]:p-0"
);

const RECOLHIDO_COM_LINK =
  "group-data-[collapsible=icon]:bg-sol group-data-[collapsible=icon]:text-sobre-cor";

const RECOLHIDO_AQUI = "group-data-[collapsible=icon]:text-sol";

const COM_LINK = cn(
  "group/continuar",
  "before:bg-muted before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:opacity-0",
  "before:transition-opacity before:duration-150 hover:before:opacity-100",
  "group-data-[collapsible=icon]:before:bg-sol-hover group-data-[collapsible=icon]:before:shadow-brilho"
);

const LINHA =
  "flex items-center gap-2.5 group-data-[collapsible=icon]:contents";

const REDONDO = cn(
  "bg-sol text-sobre-cor grid size-8 shrink-0 place-items-center rounded-full group-data-[collapsible=icon]:contents group-data-[collapsible=icon]:text-inherit [&_svg]:size-3.5 [&_svg]:fill-current group-data-[collapsible=icon]:[&_svg]:size-4",
  "ease-forte group-hover/continuar:bg-sol-hover group-hover/continuar:shadow-brilho transition-[background-color,box-shadow] duration-150"
);

function Icone({ tipo }: { tipo: Continuar["tipo"] }) {
  return tipo === "questionario" ? (
    <ListChecks aria-hidden="true" />
  ) : (
    <Play aria-hidden="true" />
  );
}

type Linhas = Pick<Continuar, "pct" | "tipo" | "titulo"> & { chamada: string };

function ConteudoDoCartao({ chamada, pct, tipo, titulo }: Linhas) {
  return (
    <>
      <span className={cn(LINHA, pct === null && "py-1.5")}>
        <span className={REDONDO}>
          <Icone tipo={tipo} />
        </span>
        <span className="grid min-w-0 leading-tight group-data-[collapsible=icon]:sr-only">
          <b className="text-titulo truncate text-[13px] font-semibold">
            {titulo}
          </b>
          <span className="text-muted-foreground text-xs">{chamada}</span>
        </span>
      </span>
      {pct === null ? null : (
        <span
          aria-hidden="true"
          className="bg-trilho ring-muted-foreground h-1 overflow-hidden rounded-full ring-1 ring-inset group-data-[collapsible=icon]:hidden"
        >
          <span
            className="bg-sol block h-full rounded-full"
            style={{ width: `${pct}%` }}
          />
        </span>
      )}
    </>
  );
}

function Cartao({ cartao }: { cartao: Promise<Continuar | null> }) {
  const caminho = usePathname();
  const { recolhida } = useModoDaCasca();
  const c = use(cartao);

  if (!c) {
    return null;
  }

  const aqui = estaAqui(c, caminho);
  const chamada = aqui ? c.chamadaAqui : c.chamada;

  return (
    <Tooltip disabled={!recolhida}>
      <TooltipTrigger
        render={
          aqui ? (
            <div aria-current="page" className={cn(CARTAO, RECOLHIDO_AQUI)} />
          ) : (
            <Link
              aria-label={c.rotulo}
              className={cn(CARTAO, RECOLHIDO_COM_LINK, COM_LINK)}
              href={c.href}
            />
          )
        }
      >
        <ConteudoDoCartao
          chamada={chamada}
          pct={c.pct}
          tipo={c.tipo}
          titulo={c.titulo}
        />
      </TooltipTrigger>
      <TooltipContent className={DICA} side="right">
        {chamada}
        <span className={DICA_SECUNDARIA}>
          {c.titulo}, {c.curso}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}

const ESPACO_SEM_QUEBRA_QUE_DA_ALTURA = "\u00A0";

function Esqueleto() {
  return (
    <div
      aria-hidden="true"
      className="bg-sidebar-accent grid animate-pulse gap-2 rounded-[14px] p-3 group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:rounded-full group-data-[collapsible=icon]:p-0"
    >
      <span className="invisible contents group-data-[collapsible=icon]:hidden">
        <ConteudoDoCartao
          chamada={ESPACO_SEM_QUEBRA_QUE_DA_ALTURA}
          pct={null}
          tipo="continuar"
          titulo={ESPACO_SEM_QUEBRA_QUE_DA_ALTURA}
        />
      </span>
    </div>
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
