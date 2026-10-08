"use client";

import type { CartaoDeTroca as Cartao } from "@cursos/api/dominio/troca";
import { Button } from "@cursos/ui/components/button";
import { cn } from "@cursos/ui/lib/utils";
import { BookOpen, Check, Gift, Loader2, Play, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type KeyboardEvent, useCallback, useEffect, useRef } from "react";

import { BOTAO, BOTAO_CONTORNO } from "@/components/casca/botoes";
import { faltam, fmtMin, fmtNum, fmtPts, plural } from "@/lib/formato";
import { useAcao } from "@/lib/use-acao";
import { trpcClient } from "@/utils/trpc";

type PodeTrocar = Extract<Cartao, { tipo: "pode_trocar" }>;
type Momento = "parado" | "confirmando" | "enviando";

const ERRO_DA_TROCA =
  "Não deu para confirmar a troca. Confira seu saldo e o extrato antes de tentar de novo.";

interface AcoesDoCartao {
  cancelar: () => void;
  confirmar: () => void;
  trocar: () => void;
}

function Acao({
  acoes,
  cartao,
  momento,
  alvoDoFoco,
}: {
  acoes: AcoesDoCartao;
  cartao: Cartao;
  momento: Momento;
  alvoDoFoco: (el: HTMLElement | null) => void;
}) {
  const { curso } = cartao;
  switch (cartao.tipo) {
    case "trocado":
      return (
        <>
          <Link
            className={cn(BOTAO, "w-full")}
            href={`/cursos/${curso.slug}`}
            ref={alvoDoFoco}
          >
            <Play aria-hidden="true" className="fill-current" />
            Começar curso
          </Link>
          <span className="text-[13px] text-muted-foreground">
            Liberado para sempre. Já está em Meus cursos.
          </span>
        </>
      );
    case "faltam":
      return (
        <>
          <div className="grid gap-2">
            <div className="flex justify-between gap-2 text-[13px] text-muted-foreground tabular-nums">
              <span>
                Você tem{" "}
                <b className="font-semibold text-foreground">
                  {fmtNum(cartao.saldo)}
                </b>
              </span>
              <span>{cartao.pct}%</span>
            </div>
            <div
              aria-label={`Pontos para ${curso.titulo}`}
              aria-valuemax={cartao.preco}
              aria-valuemin={0}
              aria-valuenow={cartao.saldo}
              className="h-2 overflow-hidden rounded-full bg-trilho ring-1 ring-muted-foreground ring-inset"
              role="progressbar"
            >
              <div
                className="h-full rounded-full bg-sol"
                style={{ width: `${cartao.pct}%` }}
              />
            </div>
          </div>
          <Button
            className={cn(
              BOTAO_CONTORNO,
              "w-full border-input text-muted-foreground disabled:opacity-100 dark:border-input"
            )}
            disabled
          >
            {faltam(cartao.faltam)} {fmtPts(cartao.faltam)}
          </Button>
        </>
      );
    case "pode_trocar":
      if (momento === "parado") {
        return (
          <Button
            className={cn(BOTAO, "w-full")}
            onClick={acoes.trocar}
            ref={alvoDoFoco}
          >
            <Gift aria-hidden="true" />
            Trocar por {fmtPts(cartao.preco)}
          </Button>
        );
      }
      return (
        <Confirmacao
          acoes={acoes}
          alvoDoFoco={alvoDoFoco}
          cartao={cartao}
          enviando={momento === "enviando"}
        />
      );
    default:
      return cartao satisfies never;
  }
}

function Confirmacao({
  acoes,
  cartao,
  enviando,
  alvoDoFoco,
}: {
  acoes: AcoesDoCartao;
  cartao: PodeTrocar;
  enviando: boolean;
  alvoDoFoco: (el: HTMLElement | null) => void;
}) {
  const id = `confirma-${cartao.curso.id}`;
  const { cancelar } = acoes;
  const aoTeclar = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !enviando) {
        cancelar();
      }
    },
    [cancelar, enviando]
  );
  return (
    <fieldset
      aria-labelledby={id}
      className="-mx-[18px] grid min-w-0 gap-3 border-border border-t px-[18px] pt-3"
    >
      <p className="text-foreground text-sm" id={id}>
        Trocar{" "}
        <b className="text-titulo tabular-nums">{fmtPts(cartao.preco)}</b> por{" "}
        <b className="text-titulo">{cartao.curso.titulo}</b>? O curso fica
        liberado para sempre.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          aria-busy={enviando}
          className={cn(BOTAO, "flex-[1_1_110px] disabled:opacity-100")}
          disabled={enviando}
          focusableWhenDisabled
          onClick={acoes.confirmar}
          onKeyDown={aoTeclar}
          ref={alvoDoFoco}
        >
          {enviando ? (
            <Loader2
              aria-hidden="true"
              className="animate-spin motion-reduce:animate-none"
            />
          ) : null}
          Confirmar
        </Button>
        <Button
          className={cn(
            BOTAO_CONTORNO,
            "flex-[1_1_110px] hover:bg-popover dark:hover:bg-popover"
          )}
          disabled={enviando}
          onClick={cancelar}
          onKeyDown={aoTeclar}
        >
          Cancelar
        </Button>
      </div>
    </fieldset>
  );
}

export interface Grade {
  abrir: (id: Cartao["curso"]["id"]) => void;
  fechar: (id: Cartao["curso"]["id"]) => void;
  trocou: (lancamentoId: string) => void;
}

export function CartaoDeTroca({
  cartao,
  confirmando,
  grade,
  sizes,
}: {
  cartao: Cartao;
  confirmando: boolean;
  grade: Grade;
  sizes: string;
}) {
  const { executar, pendente: enviando } = useAcao();
  const card = useRef<HTMLElement>(null);
  const titulo = useRef<HTMLHeadingElement>(null);
  const alvoDoFoco = useRef<HTMLElement | null>(null);
  const querFoco = useRef<boolean>(false);
  const marcarAlvoDoFoco = useCallback((el: HTMLElement | null) => {
    alvoDoFoco.current = el;
  }, []);

  let momento: Momento = "parado";
  if (enviando) {
    momento = "enviando";
  } else if (confirmando) {
    momento = "confirmando";
  }

  useEffect(() => {
    if (!querFoco.current || momento === "enviando") {
      return;
    }
    querFoco.current = false;
    const ativo = document.activeElement;
    if (ativo && ativo !== document.body && !card.current?.contains(ativo)) {
      return;
    }
    (cartao.tipo === "faltam" ? titulo.current : alvoDoFoco.current)?.focus();
  }, [momento, cartao.tipo]);

  const { curso } = cartao;
  const acoes: AcoesDoCartao = {
    cancelar: () => {
      querFoco.current = true;
      grade.fechar(curso.id);
    },
    confirmar: () => {
      if (cartao.tipo !== "pode_trocar") {
        return;
      }
      querFoco.current = true;
      grade.fechar(curso.id);
      executar(
        () =>
          trpcClient.troca.trocar.mutate({
            cursoId: curso.id,
            precoVisto: cartao.preco,
          }),
        {
          depois: (r) => grade.trocou(r.lancamentoId),
          erro: ERRO_DA_TROCA,
        }
      );
    },
    trocar: () => {
      querFoco.current = true;
      grade.abrir(curso.id);
    },
  };

  const liberado = cartao.tipo === "trocado";
  const tituloId = `troca-titulo-${curso.id}`;
  return (
    <article
      aria-labelledby={tituloId}
      className={cn(
        "flex flex-col rounded-[20px] bg-card px-3 pt-3 pb-4 text-card-foreground ring-1 transition-shadow",
        liberado ? "ring-ceu" : "ring-border hover:ring-input"
      )}
      ref={card}
    >
      <div className="relative aspect-video overflow-hidden rounded-lg bg-sidebar">
        <Image
          alt={curso.capa.alt}
          className="object-cover"
          fill
          sizes={sizes}
          src={curso.capa.url}
        />
        {liberado && (
          <span className="absolute top-2.5 left-2.5 inline-flex h-6 items-center gap-1.5 rounded-full bg-ceu px-2.5 font-semibold text-sobre-cor text-xs">
            <Check
              aria-hidden="true"
              className="size-[13px]"
              strokeWidth={2.4}
            />
            Liberado
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 px-1.5 pt-3.5">
        <span className="text-[13px] text-muted-foreground">{curso.tema}</span>
        <h3
          className="font-semibold text-[17px] text-titulo leading-[1.3] focus:outline-none"
          id={tituloId}
          ref={titulo}
          tabIndex={-1}
        >
          {curso.titulo}
        </h3>
        <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <BookOpen aria-hidden="true" className="size-3.5" />
          {plural(curso.aulas, "aula", "aulas")}
          <span aria-hidden="true">·</span>
          {fmtMin(curso.duracaoSeg)}
        </span>
        {!liberado && (
          <span className="mt-auto flex items-center gap-1.5 pt-3 font-bold text-lg text-sol tabular-nums">
            <Star
              aria-hidden="true"
              className="size-[18px] fill-current"
              strokeWidth={1.4}
            />
            {fmtPts(cartao.preco)}
          </span>
        )}
      </div>
      <div className="grid gap-2.5 px-1.5 pt-3">
        <Acao
          acoes={acoes}
          alvoDoFoco={marcarAlvoDoFoco}
          cartao={cartao}
          momento={momento}
        />
      </div>
    </article>
  );
}
