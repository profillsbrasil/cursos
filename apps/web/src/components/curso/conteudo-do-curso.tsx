"use client";

import type {
  AulaDaPagina,
  ModuloDaPagina,
  PaginaDoCurso,
} from "@cursos/api/dominio/pagina-do-curso";
import type { AulaId } from "@cursos/api/dominio/tipos";
import { cn } from "@cursos/ui/lib/utils";
import { Check, ChevronDown, ListChecks, RotateCcw } from "lucide-react";
import Link from "next/link";
import { type SyntheticEvent, useCallback, useState } from "react";

import { fmtMin, plural } from "@/lib/formato";
import { caminhoDaAula } from "@/lib/rotas";

import {
  abertosDeSaida,
  aulaAtual,
  linhasDoModulo,
  type MarcaDoModulo,
  marcaDoModulo,
  parouEm,
  seloDoQuestionario,
} from "./textos";

const LINK_QUE_COBRE_A_LINHA =
  "decoration-muted-foreground underline-offset-4 after:absolute after:inset-0 after:rounded-xl hover:text-titulo hover:underline";

const COR_DA_MARCA: Record<MarcaDoModulo, string> = {
  atual: "bg-sol/14 text-sol",
  feito: "bg-ceu text-sobre-cor",
  pendente: "bg-popover text-foreground",
  questionario:
    "bg-transparent text-canela ring-[1.5px] ring-canela ring-inset",
};

const SELO_DO_QUESTIONARIO = {
  a_fazer: "bg-canela/14 text-canela",
  reprovado: "bg-transparent text-canela ring-1 ring-canela ring-inset",
} as const;

function SeloDoQuestionario({ aula }: { aula: AulaDaPagina }) {
  const selo = seloDoQuestionario(aula);
  if (!selo) {
    return null;
  }
  const Icone = selo.tipo === "reprovado" ? RotateCcw : ListChecks;
  return (
    <span
      className={cn(
        "col-start-2 mt-1.5 inline-flex h-[22px] w-fit items-center gap-1.5 rounded-full px-2 font-semibold text-xs",
        SELO_DO_QUESTIONARIO[selo.tipo]
      )}
    >
      <Icone aria-hidden="true" className="size-3" strokeWidth={2.4} />
      {selo.texto}
    </span>
  );
}

function NumeroDoModulo({
  marca,
  numero,
}: {
  marca: MarcaDoModulo;
  numero: number;
}) {
  return (
    <span
      className={cn(
        "grid size-7 place-items-center rounded-full font-semibold text-[13px] tabular-nums",
        COR_DA_MARCA[marca]
      )}
    >
      {marca === "feito" ? (
        <>
          <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
          <span className="sr-only">Concluído.</span>
        </>
      ) : (
        <span aria-hidden="true">{numero}</span>
      )}
    </span>
  );
}

function MarcaDaAula({
  atual,
  aula,
  numero,
}: {
  atual: boolean;
  aula: AulaDaPagina;
  numero: number;
}) {
  if (aula.assistida) {
    return (
      <span className="mt-px grid size-[22px] place-items-center rounded-full bg-ceu text-sobre-cor">
        <Check aria-hidden="true" className="size-3" strokeWidth={3} />
        <span className="sr-only">Assistida.</span>
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "mt-px grid size-[22px] place-items-center rounded-full font-semibold text-[11px] tabular-nums ring-inset",
        atual
          ? "text-sol ring-2 ring-sol"
          : "text-muted-foreground ring-[1.5px] ring-muted-foreground"
      )}
    >
      {numero}
    </span>
  );
}

function Livro({
  atual,
  modulo,
  parou,
  slug,
}: {
  atual: AulaId | null;
  modulo: ModuloDaPagina;
  parou: string | null;
  slug: string;
}) {
  return (
    <ol>
      {modulo.aulas.map((a, i) => {
        const aqui = a.id === atual;
        return (
          <li
            className={cn(
              "relative grid grid-cols-[22px_minmax(0,1fr)_auto] items-start gap-x-3.5 gap-y-1 border-border border-t py-3.5 first:border-t-0",
              aqui && "-mx-3.5 rounded-xl border-t-transparent bg-sol/8 px-3.5",
              "[[data-atual]+&]:border-t-transparent"
            )}
            data-atual={aqui ? "" : undefined}
            key={a.id}
          >
            <MarcaDaAula atual={aqui} aula={a} numero={i + 1} />
            <div className="min-w-0">
              <p
                className={cn(
                  "font-semibold",
                  aqui ? "text-titulo" : "text-foreground"
                )}
              >
                <span className="mr-2 font-medium text-muted-foreground tabular-nums">
                  {i + 1}.
                </span>
                <Link
                  aria-current={aqui ? "step" : undefined}
                  className={LINK_QUE_COBRE_A_LINHA}
                  href={caminhoDaAula(slug, a.id)}
                >
                  {a.titulo}
                </Link>
              </p>
              {a.descricao ? (
                <p className="mt-[3px] max-w-[62ch] text-pretty text-muted-foreground">
                  {a.descricao}
                </p>
              ) : null}
            </div>
            <span className="flex flex-wrap items-center justify-end gap-2.5 whitespace-nowrap pt-px text-[13px] text-muted-foreground tabular-nums">
              {aqui && parou ? (
                <span className="inline-flex h-[22px] items-center rounded-full bg-sol/14 px-2 font-semibold text-sol text-xs">
                  {parou}
                </span>
              ) : null}
              {fmtMin(a.duracaoSeg)}
            </span>
            <SeloDoQuestionario aula={a} />
          </li>
        );
      })}
    </ol>
  );
}

type Alternar = (numero: number, aberto: boolean) => void;

function ModuloDaSanfona({
  aberto,
  alternar,
  atual,
  comecou,
  modulo,
  parou,
  slug,
}: {
  aberto: boolean;
  alternar: Alternar;
  atual: AulaId | null;
  comecou: boolean;
  modulo: ModuloDaPagina;
  parou: string | null;
  slug: string;
}) {
  const { numero } = modulo;
  const aoAlternar = useCallback(
    (e: SyntheticEvent<HTMLDetailsElement>) =>
      alternar(numero, e.currentTarget.open),
    [alternar, numero]
  );
  const { direita, questionarios, sob } = linhasDoModulo(modulo, comecou);
  return (
    <details
      className="group border-border border-t first:border-t-0"
      onToggle={aoAlternar}
      open={aberto}
    >
      <summary className="group/modulo grid cursor-pointer list-none grid-cols-[28px_minmax(0,1fr)_18px] items-center gap-x-3.5 gap-y-1 px-5 py-3.5 transition-colors hover:bg-white/8 sm:grid-cols-[28px_minmax(0,1fr)_auto_18px] [&::-webkit-details-marker]:hidden">
        <NumeroDoModulo marca={marcaDoModulo(modulo, atual)} numero={numero} />
        <span className="font-semibold text-foreground group-hover/modulo:text-titulo">
          Módulo {numero} · {modulo.titulo}
          <small className="mt-px block font-normal text-muted-foreground text-xs">
            {sob}
          </small>
        </span>
        {direita ? (
          <span className="text-[13px] text-muted-foreground tabular-nums max-sm:col-start-2 max-sm:row-start-2 sm:text-right">
            {questionarios ? (
              <b className="mr-3 font-semibold text-canela">{questionarios}</b>
            ) : null}
            {direita}
          </span>
        ) : null}
        <ChevronDown
          aria-hidden="true"
          className="size-[18px] text-muted-foreground transition-transform duration-200 ease-forte group-open:rotate-180 motion-reduce:transition-none max-sm:col-start-3 max-sm:row-start-1 sm:col-start-4"
        />
      </summary>
      <div className="border-border border-t px-5 pt-1 pb-2 sm:pl-[62px]">
        <Livro atual={atual} modulo={modulo} parou={parou} slug={slug} />
      </div>
    </details>
  );
}

export function ConteudoDoCurso({ pagina }: { pagina: PaginaDoCurso }) {
  const [abertos, setAbertos] = useState<ReadonlySet<number>>(
    () => new Set(abertosDeSaida(pagina))
  );
  const { modulos, slug } = pagina;
  const todos = modulos.every((m) => abertos.has(m.numero));
  const atual = aulaAtual(pagina);
  const parou = parouEm(pagina);
  const comecou = pagina.estado.tipo !== "nao_iniciado";
  const aulas = modulos.reduce((soma, m) => soma + m.aulas.length, 0);

  const alternar = useCallback<Alternar>(
    (numero, aberto) =>
      setAbertos((antes) => {
        if (antes.has(numero) === aberto) {
          return antes;
        }
        const depois = new Set(antes);
        if (aberto) {
          depois.add(numero);
        } else {
          depois.delete(numero);
        }
        return depois;
      }),
    []
  );
  const alternarTodos = useCallback(
    () => setAbertos(todos ? new Set() : new Set(modulos.map((m) => m.numero))),
    [todos, modulos]
  );

  return (
    <section aria-labelledby="conteudo-do-curso">
      <div className="mb-3.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2
          className="font-bold text-2xl text-titulo leading-[1.33] tracking-tight"
          id="conteudo-do-curso"
        >
          Conteúdo do curso
        </h2>
        <p className="text-muted-foreground text-sm">
          {plural(modulos.length, "módulo", "módulos")} ·{" "}
          {plural(aulas, "aula", "aulas")} ·{" "}
          <button
            className="cursor-pointer rounded-md font-semibold text-ceu transition-colors hover:text-titulo"
            onClick={alternarTodos}
            type="button"
          >
            {todos ? "Fechar todos" : "Abrir todos"}
          </button>
        </p>
      </div>
      <div className="overflow-hidden rounded-[20px] bg-card ring-1 ring-border">
        {modulos.map((m) => (
          <ModuloDaSanfona
            aberto={abertos.has(m.numero)}
            alternar={alternar}
            atual={atual}
            comecou={comecou}
            key={m.numero}
            modulo={m}
            parou={parou}
            slug={slug}
          />
        ))}
      </div>
    </section>
  );
}
