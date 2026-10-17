import { Button } from "@cursos/ui/components/button";
import { cn } from "@cursos/ui/lib/utils";
import { useId } from "react";

import { BOTAO } from "@/components/casca/botoes";
import { plural } from "@/lib/formato";

import { AvisoDeVersaoMudou } from "./aviso-de-versao-mudou";
import { Carregando } from "./confirmacao-na-linha";
import { CONTORNO_DESLIGADO } from "./partes";
import type { Problema } from "./problemas";

/** O que a barra do pé e a coluna de publicação mostram do salvar. */
export interface EstadoDoSalvar {
  novo: boolean;
  pendente: boolean;
  problemas: readonly Problema[];
  recarregar: () => void;
  sujo: boolean;
  versaoMudou: boolean;
}

/**
 * Documento salvo e rascunho igual a ele (a capa escolhida conta no sujo): o
 * Salvar desliga, e a frase "Tudo salvo." diz por quê. O Ctrl+S segue a mesma
 * regra.
 */
export const nadaASalvar = ({
  novo,
  pendente,
  sujo,
}: Pick<EstadoDoSalvar, "novo" | "pendente" | "sujo">) =>
  !(novo || sujo || pendente);

export type Situacao =
  | { tipo: "problemas"; marcados: number; frases: readonly string[] }
  | { tipo: "texto"; texto: string; suja: boolean };

export function situacaoDoSalvar({
  novo,
  pendente,
  problemas,
  sujo,
}: Omit<EstadoDoSalvar, "recarregar" | "versaoMudou">): Situacao {
  const marcados = problemas.filter((p) => p.campo !== null).length;
  const frases = problemas
    .filter((p) => p.campo === null)
    .map((p) => p.mensagem);
  if (marcados > 0 || frases.length > 0) {
    return { frases, marcados, tipo: "problemas" };
  }
  if (pendente) {
    return { suja: true, texto: "Salvando…", tipo: "texto" };
  }
  if (novo) {
    return {
      suja: true,
      texto: "Rascunho. Os alunos não veem nada até você salvar.",
      tipo: "texto",
    };
  }
  return sujo
    ? { suja: true, texto: "Mudanças não salvas.", tipo: "texto" }
    : { suja: false, texto: "Tudo salvo.", tipo: "texto" };
}

function TextoDaSituacao({ situacao }: { situacao: Situacao }) {
  if (situacao.tipo === "problemas") {
    return (
      <ul className="grid gap-0.5 text-destructive">
        {situacao.marcados > 0 ? (
          <li>
            Confira{" "}
            {plural(situacao.marcados, "campo marcado", "campos marcados")}.
          </li>
        ) : null}
        {situacao.frases.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
    );
  }
  return (
    <p
      className={cn(
        "flex items-center gap-2 before:size-2 before:shrink-0 before:rounded-full before:content-['']",
        situacao.suja
          ? "text-foreground before:bg-sol"
          : "text-muted-foreground before:bg-ceu"
      )}
    >
      {situacao.texto}
    </p>
  );
}

/**
 * A situação e o Salvar, numa linha (a barra do pé) ou empilhados na largura
 * da coluna, com a tecla do atalho no botão.
 */
export function SituacaoESalvar({
  coluna = false,
  estado,
}: {
  coluna?: boolean;
  estado: EstadoDoSalvar;
}) {
  const id = useId();
  const desligado = nadaASalvar(estado);
  const { pendente, recarregar, versaoMudou } = estado;
  return (
    <div className="grid gap-3">
      {versaoMudou ? <AvisoDeVersaoMudou recarregar={recarregar} /> : null}
      <div
        className={
          coluna
            ? "grid gap-4"
            : "flex flex-wrap items-center justify-between gap-3"
        }
      >
        <div
          aria-live="polite"
          className="min-w-0 flex-1 text-[13px] md:text-sm"
          id={id}
        >
          <TextoDaSituacao situacao={situacaoDoSalvar(estado)} />
        </div>
        <Button
          aria-busy={pendente}
          aria-describedby={desligado ? id : undefined}
          aria-keyshortcuts={desligado ? undefined : "Control+S Meta+S"}
          className={cn(
            desligado ? CONTORNO_DESLIGADO : BOTAO,
            coluna && "w-full"
          )}
          disabled={pendente || desligado}
          focusableWhenDisabled
          type="submit"
        >
          <Carregando ativo={pendente} />
          Salvar
          {coluna && !desligado ? (
            <span
              aria-hidden="true"
              className="rounded-[5px] border border-sobre-cor/35 px-1.5 font-mono font-semibold text-[11px] text-sobre-cor leading-4"
            >
              Ctrl S
            </span>
          ) : null}
        </Button>
      </div>
    </div>
  );
}

export function BarraDeSalvar({
  className,
  ...estado
}: EstadoDoSalvar & { className?: string }) {
  return (
    <div
      className={cn(
        "sticky bottom-3 z-10 rounded-[20px] bg-card/95 px-4 py-3 shadow-[0_10px_30px_rgb(0_0_0/0.45)] ring-1 ring-border backdrop-blur-sm md:px-5",
        className
      )}
    >
      <SituacaoESalvar estado={estado} />
    </div>
  );
}
