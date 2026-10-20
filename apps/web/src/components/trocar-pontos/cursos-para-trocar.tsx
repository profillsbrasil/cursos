"use client";

import type { ItemDoExtrato } from "@cursos/api/dominio/pontos";
import type { CartaoDeTroca as Cartao } from "@cursos/api/dominio/troca";
import { Check, Play } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import { BOTAO_CONTORNO } from "@/components/casca/botoes";
import { sizesDaCapa } from "@/components/meus-cursos/capa-curso";
import { Secao } from "@/components/meus-cursos/secao";

import { CartaoDeTroca } from "./cartao-de-troca";
import { Extrato } from "./extrato";

type CursoId = Cartao["curso"]["id"];

const AVISO = "Curso liberado. Ele já está em Meus cursos.";

const NENHUM_CURSO_NOVO = "Nenhum curso novo para trocar agora";

/**
 * Sem curso trocável na vitrine, a culpa não é de quem estuda: a frase nunca diz
 * que faltam pontos. Ela também fala só do lado do aluno, porque a vitrine vazia
 * pode ter curso trocável que ele já alcança por liberação, e não promete prazo nem
 * que ponto não vence (decisão aberta do dono no PRODUCT.md).
 */
function subtitulo(
  cartoes: readonly Cartao[],
  temCursoTrocavelNaVitrine: boolean
) {
  const podeTrocar = cartoes.filter((c) => c.tipo === "pode_trocar").length;
  if (podeTrocar > 0) {
    return `Seu saldo já cobre ${podeTrocar} ${podeTrocar === 1 ? "curso" : "cursos"}`;
  }
  if (temCursoTrocavelNaVitrine) {
    return "Continue estudando para juntar pontos";
  }
  return cartoes.length === 0
    ? "Seus pontos continuam no saldo"
    : NENHUM_CURSO_NOVO;
}

function voltar(href: Route) {
  return (
    <Link className={BOTAO_CONTORNO} href={href}>
      <Play aria-hidden="true" />
      Voltar a estudar
    </Link>
  );
}

export function CursosParaTrocar({
  cartoes,
  extrato,
  hoje,
  temCursoTrocavelNaVitrine,
  voltarAEstudar,
}: {
  cartoes: readonly Cartao[];
  extrato: readonly ItemDoExtrato[];
  hoje: string;
  temCursoTrocavelNaVitrine: boolean;
  voltarAEstudar: Route;
}) {
  const [confirmando, setConfirmando] = useState<CursoId | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [lancamentoNovoId, setLancamentoNovoId] = useState<string | null>(null);

  function abrir(id: CursoId) {
    setAviso(null);
    setConfirmando(id);
  }

  function fechar(id: CursoId) {
    setConfirmando((atual) => (atual === id ? null : atual));
  }

  function trocou(lancamentoId: string) {
    setAviso(AVISO);
    setLancamentoNovoId(lancamentoId);
  }

  const sizes = sizesDaCapa(cartoes.length);
  return (
    <>
      {/* Nó sempre montado, fora da grade que redesenha, para o leitor de tela anunciar. */}
      <div
        className="-mt-4 flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-[14px] bg-ceu px-[18px] py-3.5 font-semibold text-sobre-cor empty:hidden"
        role="status"
      >
        {aviso ? (
          <>
            <Check aria-hidden="true" className="size-5" strokeWidth={2.4} />
            <span className="flex-[1_1_200px]">{aviso}</span>
            <Link
              className="inline-flex min-h-10 items-center rounded-md px-1 font-bold underline underline-offset-3 transition-colors duration-150 hover:bg-sobre-cor/10"
              href="/meus-cursos"
            >
              Ver em Meus cursos
            </Link>
          </>
        ) : null}
      </div>
      <Secao
        id="cursos-para-trocar"
        subtitulo={subtitulo(cartoes, temCursoTrocavelNaVitrine)}
        titulo="Cursos para trocar"
      >
        {cartoes.length === 0 ? (
          // O vazio é um cartão com o botão na mesma linha, não um texto solto.
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 rounded-[20px] bg-card px-5 py-4 ring-1 ring-border">
            <p className="max-w-[60ch] text-muted-foreground text-sm">
              {NENHUM_CURSO_NOVO}. Quando houver, ele aparece aqui.
            </p>
            {temCursoTrocavelNaVitrine ? null : voltar(voltarAEstudar)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,250px),1fr))] gap-5">
              {cartoes.map((c) => (
                <CartaoDeTroca
                  cartao={c}
                  confirmando={confirmando === c.curso.id}
                  grade={{ abrir, fechar, trocou }}
                  key={c.curso.id}
                  sizes={sizes}
                />
              ))}
            </div>
            {temCursoTrocavelNaVitrine ? null : (
              <div className="mt-5">{voltar(voltarAEstudar)}</div>
            )}
          </>
        )}
      </Secao>
      <div className="max-w-3xl">
        <Secao
          id="extrato-recente"
          subtitulo="Pontos que entraram e saíram"
          titulo="Extrato recente"
        >
          <Extrato
            hoje={hoje}
            itens={extrato}
            lancamentoNovoId={lancamentoNovoId}
          />
        </Secao>
      </div>
    </>
  );
}
