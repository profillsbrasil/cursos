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

type Linhas = Pick<Continuar, "pct" | "tipo" | "titulo"> & { chamada: string };

/**
 * O miolo do cartão. O trilho da barra existe sempre: em "comecar" (pct null) ele
 * fica invisível e guarda o lugar, então o cartão mede o mesmo nos dois casos, e o
 * esqueleto, que desenha este mesmo miolo invisível, também.
 */
function ConteudoDoCartao({ chamada, pct, tipo, titulo }: Linhas) {
  return (
    <>
      <span className="flex items-center gap-2.5">
        <span className={cn(BOTAO_REDONDO, "size-8 [&_svg]:size-3.5")}>
          <Icone tipo={tipo} />
        </span>
        <span className="grid min-w-0 leading-tight">
          <b className="truncate font-semibold text-[13px] text-titulo">
            {titulo}
          </b>
          <span className="text-muted-foreground text-xs">{chamada}</span>
        </span>
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "h-1 overflow-hidden rounded-full bg-trilho",
          pct === null && "invisible"
        )}
      >
        {pct === null ? null : (
          <span
            className="block h-full rounded-full bg-sol"
            style={{ width: `${pct}%` }}
          />
        )}
      </span>
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
  const conteudo = (
    <ConteudoDoCartao
      chamada={dica}
      pct={c.pct}
      tipo={c.tipo}
      titulo={c.titulo}
    />
  );
  return (
    <>
      {aqui ? (
        <div aria-current="page" className={CARTAO}>
          {conteudo}
        </div>
      ) : (
        <Link
          aria-label={c.rotulo}
          className={cn(CARTAO, "hover:bg-muted")}
          href={c.href}
        >
          {conteudo}
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

// O espaço sem quebra (U+00A0) dá altura às linhas de texto invisíveis; um espaço
// comum sozinho colapsa, e a linha mediria 0 px.
const LINHA_VAZIA = "\u00a0";

// A altura vem do mesmo miolo do cartão, desenhado invisível, e não de um número:
// o rodapé não pula quando o cartão chega. Recolhida, vira o círculo de 40 px.
function Esqueleto() {
  return (
    <div
      aria-hidden="true"
      className="grid animate-pulse gap-2 rounded-[14px] bg-sidebar-accent p-3 group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:rounded-full group-data-[collapsible=icon]:p-0 motion-reduce:animate-none"
    >
      <span className="invisible contents group-data-[collapsible=icon]:hidden">
        <ConteudoDoCartao
          chamada={LINHA_VAZIA}
          pct={null}
          tipo="continuar"
          titulo={LINHA_VAZIA}
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
