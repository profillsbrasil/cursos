"use client";

import type { ItemDoExtrato } from "@cursos/api/dominio/pontos";
import type { CartaoDeTroca as Cartao } from "@cursos/api/dominio/troca";
import { Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { sizesDaCapa } from "@/components/meus-cursos/capa-curso";
import { Secao } from "@/components/meus-cursos/secao";

import { CartaoDeTroca } from "./cartao-de-troca";
import { Extrato } from "./extrato";

type CursoId = Cartao["curso"]["id"];

const AVISO = "Curso liberado. Ele já está em Meus cursos.";

export function CursosParaTrocar({
  cartoes,
  extrato,
  hoje,
}: {
  cartoes: readonly Cartao[];
  extrato: readonly ItemDoExtrato[];
  hoje: string;
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

  const podeTrocar = cartoes.filter((c) => c.tipo === "pode_trocar").length;
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
              className="inline-flex min-h-10 items-center px-1 font-bold underline underline-offset-3 focus-visible:outline-2 focus-visible:outline-sobre-cor focus-visible:outline-solid focus-visible:outline-offset-2"
              href="/meus-cursos"
            >
              Ver em Meus cursos
            </Link>
          </>
        ) : null}
      </div>
      <Secao
        id="cursos-para-trocar"
        subtitulo={
          podeTrocar > 0
            ? `Seu saldo já cobre ${podeTrocar} ${podeTrocar === 1 ? "curso" : "cursos"}`
            : "Continue estudando para juntar pontos"
        }
        titulo="Cursos para trocar"
      >
        {cartoes.length === 0 ? (
          <p className="text-muted-foreground">
            Nenhum curso aceita troca agora.
          </p>
        ) : (
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
        )}
      </Secao>
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
    </>
  );
}
