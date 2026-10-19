"use client";

import { useUser } from "@clerk/nextjs";

import { CabecalhoDaMinhaConta, EsqueletoDaMinhaConta } from "./esqueleto";
import { SecaoDaEntrada } from "./secao-da-entrada";
import { SecaoDaSenha } from "./secao-da-senha";
import { SecaoDeSair } from "./secao-de-sair";
import { SecaoDoNome } from "./secao-do-nome";
import { SecaoDosAparelhos } from "./secao-dos-aparelhos";

/** A versão B do protótipo, com Excluir conta no lugar de "fale com a Profills". */
export function TelaDaMinhaConta({ certificados }: { certificados: number }) {
  const { isLoaded, user } = useUser();
  if (!(isLoaded && user)) {
    return <EsqueletoDaMinhaConta />;
  }
  return (
    <>
      <CabecalhoDaMinhaConta />
      <div className="@container grid gap-[18px]">
        <div className="grid @min-[56rem]:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] items-start gap-[18px]">
          <SecaoDoNome certificados={certificados} key={user.id} user={user} />
          <div className="grid min-w-0 gap-[18px]">
            <SecaoDaEntrada user={user} />
            <SecaoDaSenha user={user} />
          </div>
        </div>
        <SecaoDosAparelhos user={user} />
        <SecaoDeSair certificados={certificados} user={user} />
      </div>
    </>
  );
}
