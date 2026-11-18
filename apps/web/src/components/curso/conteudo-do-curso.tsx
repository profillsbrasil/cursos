"use client";

import type {
  AulaDaPagina,
  ModuloDaPagina,
  PaginaDoCurso,
} from "@cursos/api/dominio/pagina-do-curso";
import type { AulaId } from "@cursos/api/dominio/tipos";
import { cn } from "@cursos/ui/lib/utils";
import { Check, ChevronDown, ListChecks, Lock, RotateCcw } from "lucide-react";
import Link from "next/link";
import { type SyntheticEvent, useCallback, useState } from "react";

import { CARTAO } from "@/components/casca/cartoes";
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
        "col-start-2 mt-1.5 inline-flex h-[22px] w-fit items-center gap-1.5 rounded-full px-2 text-xs font-semibold",
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
        "grid size-7 place-items-center rounded-full text-[13px] font-semibold tabular-nums",
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
      <span className="bg-ceu text-sobre-cor mt-px grid size-[22px] place-items-center rounded-full">
        <Check aria-hidden="true" className="size-3" strokeWidth={3} />
        <span className="sr-only">Assistida.</span>
      </span>
    );
  }
  return (
    <span
      className={cn(
        "mt-px grid size-[22px] place-items-center rounded-full text-[11px] font-semibold tabular-nums ring-inset",
        atual
          ? "text-sol ring-sol ring-2"
          : "text-muted-foreground ring-muted-foreground ring-[1.5px]"
      )}
    >
      {numero}
    </span>
  );
}

/** Na amostra, a aula fechada: o cadeado no lugar do número, sem link. */
function AulaFechada({ aula }: { aula: AulaDaPagina }) {
  return (
    <li className="border-border relative grid grid-cols-[22px_minmax(0,1fr)_auto] items-start gap-x-3.5 gap-y-1 border-t py-3.5 pr-5 pl-5 first:border-t-0 sm:pl-[62px] [[data-atual]+&]:border-t-transparent">
      <span className="text-muted-foreground mt-px grid size-[22px] place-items-center">
        <Lock aria-hidden="true" className="size-4" />
        <span className="sr-only">Fechada.</span>
      </span>
      <p className="text-muted-foreground font-semibold">{aula.titulo}</p>
      <span className="text-muted-foreground flex flex-wrap items-center justify-end gap-2.5 pt-px text-[13px] whitespace-nowrap tabular-nums">
        Troque para assistir
        <span>{fmtMin(aula.duracaoSeg)}</span>
      </span>
      {aula.descricao ? (
        <p className="text-muted-foreground col-start-2 col-end-4 line-clamp-2 text-pretty whitespace-pre-line sm:col-end-3">
          {aula.descricao}
        </p>
      ) : null}
    </li>
  );
}

function Livro({
  amostra,
  atual,
  modulo,
  parou,
  slug,
}: {
  /** A aula de amostra; null no curso inteiro. */
  amostra: AulaId | null;
  atual: AulaId | null;
  modulo: ModuloDaPagina;
  parou: string | null;
  slug: string;
}) {
  return (
    <ol>
      {modulo.aulas.map((a, i) => {
        if (amostra !== null && a.id !== amostra) {
          return <AulaFechada aula={a} key={a.id} />;
        }
        const aqui = a.id === atual;
        return (
          <li
            className={cn(
              "border-border relative grid grid-cols-[22px_minmax(0,1fr)_auto] items-start gap-x-3.5 gap-y-1 border-t py-3.5 pr-5 pl-5 first:border-t-0 sm:pl-[62px]",
              aqui && "bg-sol/8 border-t-transparent",
              "[[data-atual]+&]:border-t-transparent"
            )}
            data-atual={aqui ? "" : undefined}
            key={a.id}
          >
            <MarcaDaAula atual={aqui} aula={a} numero={i + 1} />
            <p
              className={cn(
                "font-semibold",
                aqui ? "text-titulo" : "text-foreground"
              )}
            >
              <Link
                aria-current={aqui ? "step" : undefined}
                className={LINK_QUE_COBRE_A_LINHA}
                href={caminhoDaAula(slug, a.id)}
              >
                {a.titulo}
              </Link>
            </p>
            <span className="text-muted-foreground flex flex-wrap items-center justify-end gap-2.5 pt-px text-[13px] whitespace-nowrap tabular-nums">
              {aqui && parou ? (
                <span className="bg-sol/14 text-sol inline-flex h-[22px] items-center rounded-full px-2 text-xs font-semibold">
                  {parou}
                </span>
              ) : null}
              {amostra === a.id ? (
                <span className="bg-sol text-sobre-cor inline-flex h-[22px] items-center rounded-full px-2 text-xs font-semibold">
                  Amostra
                </span>
              ) : null}
              {fmtMin(a.duracaoSeg)}
            </span>
            {a.descricao ? (
              <p className="text-muted-foreground col-start-2 col-end-4 line-clamp-2 text-pretty whitespace-pre-line sm:col-end-3">
                {a.descricao}
              </p>
            ) : null}
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
  amostra,
  atual,
  comecou,
  modulo,
  parou,
  slug,
}: {
  aberto: boolean;
  alternar: Alternar;
  amostra: AulaId | null;
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
        <span className="text-foreground group-hover/modulo:text-titulo font-semibold">
          Módulo {numero} · {modulo.titulo}
          <small className="text-muted-foreground mt-px block text-xs font-normal">
            {sob}
          </small>
        </span>
        {direita ? (
          <span className="text-muted-foreground text-[13px] tabular-nums max-sm:col-start-2 max-sm:row-start-2 sm:text-right">
            {questionarios ? (
              <b className="text-canela mr-3 font-semibold">{questionarios}</b>
            ) : null}
            {direita}
          </span>
        ) : null}
        <ChevronDown
          aria-hidden="true"
          className="text-muted-foreground ease-forte size-[18px] transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none max-sm:col-start-3 max-sm:row-start-1 sm:col-start-4"
        />
      </summary>
      <div className="border-border border-t">
        <Livro
          amostra={amostra}
          atual={atual}
          modulo={modulo}
          parou={parou}
          slug={slug}
        />
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
          className="text-titulo text-2xl leading-[1.33] font-bold tracking-tight"
          id="conteudo-do-curso"
        >
          Conteúdo do curso
        </h2>
        <p className="text-muted-foreground">
          {plural(modulos.length, "módulo", "módulos")} ·{" "}
          {plural(aulas, "aula", "aulas")} ·{" "}
          <button
            className="toque text-ceu hover:text-titulo cursor-pointer rounded-md font-semibold transition-colors"
            onClick={alternarTodos}
            type="button"
          >
            {todos ? "Fechar todos" : "Abrir todos"}
          </button>
        </p>
      </div>
      <div className={cn(CARTAO, "overflow-hidden")}>
        {modulos.map((m) => (
          <ModuloDaSanfona
            aberto={abertos.has(m.numero)}
            alternar={alternar}
            amostra={pagina.amostra?.aulaId ?? null}
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
