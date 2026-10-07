"use client";

import type { ItemDoExtrato } from "@cursos/api/dominio/pontos";
import type { CartaoDeTroca as Cartao } from "@cursos/api/dominio/troca";
import { TRPCClientError } from "@trpc/client";
import { Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { sizesDaCapa } from "@/components/meus-cursos/capa-curso";
import { Secao } from "@/components/meus-cursos/secao";
import { trpcClient } from "@/utils/trpc";

import { alvoDeFoco, CartaoDeTroca, type Momento } from "./cartao-de-troca";
import { Extrato } from "./extrato";

type CursoId = Cartao["curso"]["id"];

/** Para onde o foco vai depois do próximo desenho; com `antes`, só depois que cartoes mudar. */
interface PedidoDeFoco {
  alvos: readonly ("trocar" | "confirmar" | "comecar")[];
  antes?: readonly Cartao[];
}

const AVISO = "Curso liberado. Ele já está em Meus cursos.";

// As recusas da troca chegam com a mensagem pronta em pt-BR; o resto é falha de rede ou do
// servidor, e aí o cliente não sabe se a troca gravou: o refresh mostra a verdade.
const RECUSAS = new Set(["CONFLICT", "NOT_FOUND", "PRECONDITION_FAILED"]);

function mensagemDoErro(e: unknown) {
  if (e instanceof TRPCClientError && RECUSAS.has(e.data?.code)) {
    return e.message;
  }
  return "Não deu para confirmar a troca. Confira seu saldo e o extrato antes de tentar de novo.";
}

/** Dono do aviso, da grade e do extrato: o extrato destaca a linha da troca recém-feita. */
export function CursosParaTrocar({
  cartoes,
  extrato,
  hoje,
}: {
  cartoes: readonly Cartao[];
  extrato: readonly ItemDoExtrato[];
  hoje: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  // Um card confirma por vez; vários podem estar enviando, e cada um segue sozinho.
  const [confirmando, setConfirmando] = useState<CursoId | null>(null);
  // Um curso sai daqui só quando o refresh traz o card novo: até lá ele fica ocupado.
  const [enviando, setEnviando] = useState<ReadonlySet<CursoId>>(new Set());
  const [aviso, setAviso] = useState<string | null>(null);
  const [destaque, setDestaque] = useState<string | null>(null);
  const grade = useRef<HTMLDivElement>(null);
  const focos = useRef(new Map<CursoId, PedidoDeFoco>());
  const atuais = useRef(cartoes);

  // Sem lista de dependências: roda depois de cada desenho, e cada pedido se resolve uma vez.
  useEffect(() => {
    atuais.current = cartoes;
    for (const [id, pedido] of focos.current) {
      if (pedido.antes === cartoes) {
        continue;
      }
      focos.current.delete(id);
      if (pedido.antes) {
        setEnviando((s) => new Set([...s].filter((x) => x !== id)));
      }
      const card = grade.current?.querySelector<HTMLElement>(
        `[data-cartao="${id}"]`
      );
      const ativo = document.activeElement;
      // Não rouba o foco de quem já foi para outro lugar enquanto o servidor respondia.
      if (
        !card ||
        (ativo && ativo !== document.body && !card.contains(ativo))
      ) {
        continue;
      }
      const alvo =
        pedido.alvos
          .map((a) =>
            card.querySelector<HTMLElement>(
              `[data-foco="${alvoDeFoco(a, id)}"]`
            )
          )
          .find((el) => el !== null) ?? card.querySelector<HTMLElement>("h3");
      alvo?.focus();
    }
  });

  function abrir(id: CursoId) {
    setAviso(null);
    setConfirmando(id);
    focos.current.set(id, { alvos: ["confirmar"] });
  }

  function cancelar(id: CursoId) {
    setConfirmando(null);
    focos.current.set(id, { alvos: ["trocar"] });
  }

  async function confirmar(c: Extract<Cartao, { tipo: "pode_trocar" }>) {
    const { id } = c.curso;
    setEnviando((s) => new Set(s).add(id));
    setConfirmando((atual) => (atual === id ? null : atual));
    try {
      const r = await trpcClient.troca.trocar.mutate({
        cursoId: id,
        precoVisto: c.preco,
      });
      setAviso(AVISO);
      setDestaque(r.lancamentoId);
      focos.current.set(id, { alvos: ["comecar"], antes: atuais.current });
    } catch (e) {
      toast.error(mensagemDoErro(e));
      focos.current.set(id, {
        alvos: ["trocar", "comecar"],
        antes: atuais.current,
      });
    }
    // Sucesso ou recusa: o servidor tem a verdade nova (saldo, preço, estado do card).
    startTransition(() => router.refresh());
  }

  const momentoDe = (id: CursoId): Momento => {
    if (enviando.has(id)) {
      return "enviando";
    }
    return confirmando === id ? "confirmando" : "parado";
  };
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
          <div
            className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,250px),1fr))] gap-5"
            ref={grade}
          >
            {cartoes.map((c) => (
              <CartaoDeTroca
                acoes={{
                  cancelar: () => cancelar(c.curso.id),
                  confirmar: () => {
                    if (c.tipo === "pode_trocar") {
                      confirmar(c);
                    }
                  },
                  trocar: () => abrir(c.curso.id),
                }}
                cartao={c}
                key={c.curso.id}
                momento={momentoDe(c.curso.id)}
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
        <Extrato destaque={destaque} hoje={hoje} itens={extrato} />
      </Secao>
    </>
  );
}
