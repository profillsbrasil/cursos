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

import { DICA, DICA_SECUNDARIA } from "@/components/casca/estilo";
import { useModoDaCasca } from "@/components/casca/provedor-da-casca";

import { type Continuar, estaAqui } from "./continuar";

// Um elemento só nos dois modos, como o SidebarMenuButton: aberto, o cartão;
// recolhida, ele encolhe para o botão redondo de 40 px em Sol, preso à esquerda como
// os itens. O group-data vence as classes do cartão pela especificidade. O elemento
// não tem transição: a troca de modo (Ctrl+B inclusive) muda a cor na hora.
const CARTAO = cn(
  "relative isolate grid gap-2 rounded-[14px] bg-sidebar-accent p-3 text-sidebar-foreground",
  "group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:place-items-center group-data-[collapsible=icon]:rounded-full group-data-[collapsible=icon]:bg-sol group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:text-sobre-cor"
);

// O hover também é o foco de teclado (#30). Aberto, o fundo vira popover; recolhida,
// o redondo clareia e brilha como o botão amarelo. A cor do hover mora numa camada
// (::before) atrás do miolo, e só a opacidade dela transiciona: o hover entra e sai
// em 150 ms, e a troca de modo, que só troca a cor da camada, não anima.
const COM_LINK = cn(
  "before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:bg-muted before:opacity-0",
  "before:transition-opacity before:duration-150 before:ease-out hover:before:opacity-100 motion-reduce:before:transition-none",
  "group-data-[collapsible=icon]:before:bg-sol-hover group-data-[collapsible=icon]:before:shadow-brilho"
);

// Recolhida, a linha e o redondo de 32 px saem da caixa (contents), e o ícone fica
// sozinho no centro do redondo de 40 px.
const LINHA =
  "flex items-center gap-2.5 group-data-[collapsible=icon]:contents";

const REDONDO =
  "grid size-8 shrink-0 place-items-center rounded-full bg-sol text-sobre-cor [&_svg]:size-3.5 [&_svg]:fill-current group-data-[collapsible=icon]:contents group-data-[collapsible=icon]:[&_svg]:size-4";

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
 * esqueleto, que desenha este mesmo miolo invisível, também. Recolhida, o título e a
 * chamada ficam só para o leitor de tela, e a barra some.
 */
function ConteudoDoCartao({ chamada, pct, tipo, titulo }: Linhas) {
  return (
    <>
      <span className={LINHA}>
        <span className={REDONDO}>
          <Icone tipo={tipo} />
        </span>
        <span className="grid min-w-0 leading-tight group-data-[collapsible=icon]:sr-only">
          <b className="truncate font-semibold text-[13px] text-titulo">
            {titulo}
          </b>
          <span className="text-muted-foreground text-xs">{chamada}</span>
        </span>
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "h-1 overflow-hidden rounded-full bg-trilho group-data-[collapsible=icon]:hidden",
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
  const { recolhida } = useModoDaCasca();
  const c = use(cartao);
  if (!c) {
    return null;
  }
  const aqui = estaAqui(c, caminho);
  const chamada = aqui ? c.chamadaAqui : c.chamada;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          aqui ? (
            <div aria-current="page" className={CARTAO} />
          ) : (
            <Link
              aria-label={c.rotulo}
              className={cn(CARTAO, COM_LINK)}
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
      <TooltipContent className={DICA} hidden={!recolhida} side="right">
        {chamada}
        <span className={DICA_SECUNDARIA}>{c.titulo}</span>
      </TooltipContent>
    </Tooltip>
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
