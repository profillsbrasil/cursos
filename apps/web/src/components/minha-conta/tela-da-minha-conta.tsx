"use client";

import { useUser } from "@clerk/nextjs";

import { CabecalhoDaMinhaConta, EsqueletoDaMinhaConta } from "./esqueleto";
import { type ContaNaEntrada, SecaoDaEntrada } from "./secao-da-entrada";
import { type ContaDaSenha, SecaoDaSenha } from "./secao-da-senha";
import { SecaoDeSair } from "./secao-de-sair";
import { type ContaDoNome, SecaoDoNome } from "./secao-do-nome";
import {
  type ContaDosAparelhos,
  SecaoDosAparelhos,
} from "./secao-dos-aparelhos";
import type { FolhaDaConta, Usuario } from "./tipos";

/** O que as seções de Minha conta leem do usuário do Clerk, cada uma o seu pedaço. */
export type ContaNaTela = ContaDaSenha &
  ContaDoNome &
  ContaDosAparelhos &
  ContaNaEntrada &
  Pick<Usuario, "delete" | "id">;

/** A versão B do protótipo, "Sua folha em destaque". */
export function TelaDaMinhaConta({
  certificados,
  folha,
}: {
  certificados: number;
  folha: FolhaDaConta;
}) {
  const { isLoaded, user } = useUser();

  if (!(isLoaded && user)) {
    return <EsqueletoDaMinhaConta />;
  }

  return (
    <ConteudoDaMinhaConta
      certificados={certificados}
      folha={folha}
      user={user}
    />
  );
}

/** As seções de Minha conta com a conta já carregada: a `TelaDaMinhaConta` entrega o usuário do `useUser()`. */
export function ConteudoDaMinhaConta({
  certificados,
  folha,
  user,
}: {
  certificados: number;
  folha: FolhaDaConta;
  user: ContaNaTela;
}) {
  return (
    <>
      <CabecalhoDaMinhaConta />
      <div className="@container grid gap-[18px]">
        <SecaoDoNome
          certificados={certificados}
          folha={folha}
          key={user.id}
          user={user}
        />
        <div className="grid items-start gap-[18px] @min-[48rem]:grid-cols-2">
          <SecaoDaEntrada user={user} />
          <SecaoDaSenha user={user} />
          <div className="grid min-w-0 @min-[48rem]:col-span-2">
            <SecaoDosAparelhos user={user} />
          </div>
        </div>
        <SecaoDeSair certificados={certificados} user={user} />
      </div>
    </>
  );
}
