"use client";

import type { StatusDoCurso } from "@cursos/api/dominio/tipos";
import { cn } from "@cursos/ui/lib/utils";
import { Check, Clock, Eye, Undo2 } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useId, useState } from "react";

import type { ItemAntesDePublicar, SecaoDoIndice } from "./antes-de-publicar";
import { type EstadoDoSalvar, SituacaoESalvar } from "./barra-de-salvar";
import { ConfirmacaoNaLinha, type LinhaAberta } from "./confirmacao-na-linha";
import { ROTULO } from "./partes";

export const STATUS: Record<
  StatusDoCurso,
  { descricao: string; icone: ReactNode; rotulo: string }
> = {
  em_producao: {
    descricao: "Fora do ar para quem não tem certificado.",
    icone: <Clock aria-hidden="true" />,
    rotulo: "Em produção",
  },
  publicado: {
    descricao: "Aberto para quem tem o curso liberado.",
    icone: <Eye aria-hidden="true" />,
    rotulo: "Publicado",
  },
};

const CARTAO = "grid gap-4 rounded-[20px] bg-card p-5 ring-1 ring-border";

// Do lado de quem não está marcado, o hover (e o foco) é o fundo popover; no
// marcado, o titulo clareia um pouco.
const OPCAO_DO_STATUS =
  "inline-flex h-[34px] cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 font-semibold text-[13px] text-foreground transition-colors hover:bg-popover hover:text-titulo aria-pressed:bg-titulo aria-pressed:text-sobre-cor aria-pressed:hover:bg-titulo/85 aria-pressed:hover:text-sobre-cor [&_svg]:size-[13px]";

function OpcaoDoStatus({
  aoMudar,
  marcado,
  status,
}: {
  aoMudar: (status: StatusDoCurso) => void;
  marcado: boolean;
  status: StatusDoCurso;
}) {
  const escolher = useCallback(() => aoMudar(status), [aoMudar, status]);
  return (
    <button
      aria-pressed={marcado}
      className={OPCAO_DO_STATUS}
      onClick={escolher}
      type="button"
    >
      {STATUS[status].icone}
      {STATUS[status].rotulo}
    </button>
  );
}

function SeletorDoStatus({
  aoMudar,
  status,
}: {
  aoMudar: (status: StatusDoCurso) => void;
  status: StatusDoCurso;
}) {
  const id = useId();
  return (
    <fieldset
      aria-describedby={`${id}-descricao`}
      className="m-0 grid min-w-0 max-w-80 gap-2 border-0 p-0"
    >
      <legend className={cn(ROTULO, "mb-2 p-0")}>Status</legend>
      <div className="grid grid-cols-2 gap-1 rounded-full bg-background p-1 ring-1 ring-muted-foreground ring-inset">
        {(Object.keys(STATUS) as StatusDoCurso[]).map((s) => (
          <OpcaoDoStatus
            aoMudar={aoMudar}
            key={s}
            marcado={s === status}
            status={s}
          />
        ))}
      </div>
      <p className="text-muted-foreground text-xs" id={`${id}-descricao`}>
        {STATUS[status].descricao}
      </p>
    </fieldset>
  );
}

function AntesDePublicar({ itens }: { itens: readonly ItemAntesDePublicar[] }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={CARTAO}>
      <h2 className="font-semibold text-base text-titulo" id={id}>
        Antes de publicar
      </h2>
      <ul className="grid gap-2.5 text-[13px]">
        {itens.map((item) => (
          <li className="flex items-start gap-2.5" key={item.nome}>
            <span
              className={cn(
                "mt-px grid size-[18px] shrink-0 place-items-center rounded-full",
                item.cumprido
                  ? "bg-ceu text-sobre-cor"
                  : "ring-[1.5px] ring-muted-foreground ring-inset"
              )}
            >
              {item.cumprido ? (
                <Check aria-hidden="true" className="size-[11px] stroke-3" />
              ) : null}
            </span>
            <span>
              {item.nome}
              <span className="sr-only">
                {item.cumprido ? ": pronto." : ": falta."}
              </span>
              {item.detalhe ? (
                <span className="block text-muted-foreground text-xs">
                  {item.detalhe}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * A seção cujo título passou pelo terço de cima da janela por último. Um só
 * observador para todas; sem IntersectionObserver, nenhuma fica marcada.
 */
function useSecaoAtual(ids: readonly string[]): string | null {
  const [atual, setAtual] = useState<string | null>(null);
  const chave = ids.join(" ");
  useEffect(() => {
    const ordem = chave.split(" ");
    const secoes = new Map<Element, string>();
    for (const id of ordem) {
      const secao = document.getElementById(id)?.closest("section");
      if (secao) {
        secoes.set(secao, id);
      }
    }
    const visiveis = new Set<string>();
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          const id = secoes.get(e.target);
          if (id && e.isIntersecting) {
            visiveis.add(id);
          } else if (id) {
            visiveis.delete(id);
          }
        }
        const primeira = ordem.find((id) => visiveis.has(id));
        if (primeira) {
          setAtual(primeira);
        }
      },
      { rootMargin: "0px 0px -66% 0px" }
    );
    for (const secao of secoes.keys()) {
      observador.observe(secao);
    }
    return () => observador.disconnect();
  }, [chave]);
  return atual;
}

function IndiceDasSecoes({ secoes }: { secoes: readonly SecaoDoIndice[] }) {
  const atual = useSecaoAtual(secoes.map((s) => s.id));
  return (
    <nav
      aria-label="Seções do editor"
      className="grid gap-0.5 rounded-[20px] bg-card p-2 ring-1 ring-border"
    >
      {secoes.map((s) => (
        <a
          aria-current={s.id === atual ? "location" : undefined}
          className="flex h-[34px] items-center justify-between gap-3 rounded-[9px] px-2.5 font-medium text-[13px] text-foreground transition-colors hover:bg-white/8 hover:text-titulo aria-[current=location]:bg-sol/8 aria-[current=location]:text-titulo"
          href={`#${s.id}`}
          key={s.id}
        >
          {s.nome}
          {s.contagem === null ? null : (
            <span className="text-muted-foreground text-xs tabular-nums">
              {s.contagem}
            </span>
          )}
        </a>
      ))}
    </nav>
  );
}

/** Um clique sem querer não perde o rascunho: o Descartar pergunta antes. */
function Descartar({
  chave,
  descartar,
  linha,
}: {
  chave: string;
  descartar: () => void;
  linha: LinhaAberta;
}) {
  const confirmar = useCallback(() => {
    linha.fechar(chave);
    descartar();
  }, [chave, descartar, linha]);
  return (
    <ConfirmacaoNaLinha
      botao={{ rotulo: "Descartar" }}
      chave={chave}
      className="grid gap-2 rounded-xl bg-muted/30 p-3 text-[13px]"
      confirmar={confirmar}
      enviando={false}
      gatilho={{
        nome: "Descartar mudanças",
        rotulo: (
          <>
            <Undo2 aria-hidden="true" className="size-3.5" />
            Descartar mudanças
          </>
        ),
      }}
      linhaAberta={linha}
      pergunta="Voltar ao último salvamento e perder as mudanças?"
    />
  );
}

/**
 * A coluna à direita do editor, presa a 24 px do topo, de 960 px de editor
 * para cima (container query do formulário). Abaixo, ela desce para o fim do
 * editor só com o status e o Descartar: a situação e o Salvar ficam na barra do
 * pé, e a lista e o índice somem.
 */
export function ColunaDePublicacao({
  antes,
  aoMudarStatus,
  descartar,
  estado,
  secoes,
  status,
}: {
  antes: readonly ItemAntesDePublicar[];
  aoMudarStatus: (status: StatusDoCurso) => void;
  descartar: () => void;
  estado: EstadoDoSalvar;
  secoes: readonly SecaoDoIndice[];
  status: StatusDoCurso;
}) {
  const largo = "@max-[960px]:hidden";
  const [aberta, setAberta] = useState<string | null>(null);
  const linha: LinhaAberta = {
    chave: aberta,
    fechar: (chave) => setAberta((a) => (a === chave ? null : a)),
    pedir: setAberta,
  };
  return (
    <aside
      aria-label="Publicação do curso"
      className="@min-[960px]:sticky @min-[960px]:top-6 @min-[960px]:row-span-2 grid gap-3.5"
    >
      <div className={CARTAO}>
        <div className={cn("grid gap-2", largo)}>
          <SituacaoESalvar coluna estado={estado} />
          {estado.sujo ? (
            <Descartar chave="largo" descartar={descartar} linha={linha} />
          ) : null}
        </div>
        <SeletorDoStatus aoMudar={aoMudarStatus} status={status} />
        {estado.sujo ? (
          <div className="@min-[960px]:hidden justify-self-start">
            <Descartar chave="estreito" descartar={descartar} linha={linha} />
          </div>
        ) : null}
      </div>
      <div className={cn("grid gap-3.5", largo)}>
        <AntesDePublicar itens={antes} />
        <IndiceDasSecoes secoes={secoes} />
      </div>
    </aside>
  );
}
