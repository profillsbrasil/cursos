"use client";

import type { ConvidadoNaTela } from "@cursos/api/dominio/convite";
import { Button } from "@cursos/ui/components/button";
import { cn } from "@cursos/ui/lib/utils";
import { useCallback, useState } from "react";

import { BOTAO_CONTORNO, PEQUENO } from "@/components/casca/botoes";
import { useAcao } from "@/lib/use-acao";
import { trpcClient } from "@/utils/trpc";

import { SeloDeSituacao } from "../acompanhamento";
import {
  Carregando,
  ConfirmacaoNaLinha,
  type LinhaAberta,
} from "../confirmacao-na-linha";
import {
  cursosDoConvidado,
  quandoDoConvidado,
  seloDoConvidado,
} from "./convites";
import { SELO_DE_ADMIN, seloDoPerfil } from "./perfis";

function LinhaDoConvidado({
  convidado: c,
  hoje,
  linhaAberta,
}: {
  convidado: ConvidadoNaTela;
  hoje: string;
  linhaAberta: LinhaAberta;
}) {
  const reenvio = useAcao();
  const cancelamento = useAcao();
  const { fechar } = linhaAberta;
  const chave = `cancelar:${c.id}`;
  const nuncaSaiu = c.estado.tipo === "nao_enviado";

  const reenviar = useCallback(
    () =>
      reenvio.executar(
        () => trpcClient.admin.convites.reenviar.mutate({ id: c.id }),
        {
          sucesso: nuncaSaiu
            ? `Convite enviado para ${c.email}.`
            : `Convite enviado de novo para ${c.email}.`,
        }
      ),
    [reenvio, c.id, c.email, nuncaSaiu]
  );

  const cancelar = useCallback(
    () =>
      cancelamento.executar(
        () => trpcClient.admin.convites.cancelar.mutate({ id: c.id }),
        {
          depois: () => fechar(chave),
          sucesso: `Convite de ${c.email} cancelado.`,
        }
      ),
    [cancelamento, c.id, c.email, chave, fechar]
  );

  const ocupada = reenvio.pendente || cancelamento.pendente;

  return (
    <li className="grid items-center gap-y-2 px-3.5 py-3 @min-[52rem]:grid-cols-[minmax(0,1fr)_9.5rem_5.5rem_minmax(0,10rem)_7.5rem_auto] @min-[52rem]:gap-x-4 @min-[52rem]:px-5 @min-[52rem]:py-3.5">
      <span className="grid min-w-0 gap-0.5">
        <span className="text-foreground truncate text-base font-medium">
          {c.email}
        </span>
        <span className="text-muted-foreground tabular-nums">
          {quandoDoConvidado(c, hoje)}
        </span>
      </span>
      <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 @min-[52rem]:contents">
        <span>
          <SeloDeSituacao
            selo={seloDoPerfil({ doCadastro: false, perfil: c.perfil })}
          />
        </span>
        <span className={c.comoAdmin ? undefined : "hidden @min-[52rem]:block"}>
          {c.comoAdmin ? (
            <SeloDeSituacao selo={SELO_DE_ADMIN} />
          ) : (
            <span className="text-muted-foreground">Aluno</span>
          )}
        </span>
        <span className="text-muted-foreground min-w-0 truncate">
          {cursosDoConvidado(c.cursos)}
        </span>
        <span>
          <SeloDeSituacao selo={seloDoConvidado(c.estado)} />
        </span>
      </span>
      <span className="flex flex-wrap items-center gap-2 @min-[52rem]:justify-end">
        <Button
          aria-busy={reenvio.pendente}
          aria-label={`${nuncaSaiu ? "Enviar" : "Reenviar"} o convite de ${c.email}`}
          className={cn(BOTAO_CONTORNO, PEQUENO)}
          disabled={ocupada}
          focusableWhenDisabled
          onClick={reenviar}
        >
          <Carregando ativo={reenvio.pendente} />
          {nuncaSaiu ? "Enviar" : "Reenviar"}
        </Button>
        <ConfirmacaoNaLinha
          botao={{ rotulo: "Cancelar convite" }}
          chave={chave}
          className="flex flex-wrap items-center gap-x-3 gap-y-2"
          confirmar={cancelar}
          enviando={cancelamento.pendente}
          gatilho={{
            nome: `Cancelar o convite de ${c.email}`,
            rotulo: "Cancelar",
          }}
          linhaAberta={linhaAberta}
          pergunta={
            <span className="text-foreground">
              O link deixa de valer. Cancelar?
            </span>
          }
        />
      </span>
    </li>
  );
}

/** As linhas da opção Convidados, com uma confirmação aberta por vez. */
export function LinhasDosConvidados({
  convidados,
  hoje,
}: {
  convidados: readonly ConvidadoNaTela[];
  hoje: string;
}) {
  const [chave, pedir] = useState<string | null>(null);

  const fechar = useCallback(
    (minha: string) => pedir((atual) => (atual === minha ? null : atual)),
    []
  );

  const linhaAberta: LinhaAberta = { chave, fechar, pedir };

  return (
    <ul className="divide-border @container divide-y">
      {convidados.map((c) => (
        <LinhaDoConvidado
          convidado={c}
          hoje={hoje}
          key={c.id}
          linhaAberta={linhaAberta}
        />
      ))}
    </ul>
  );
}
