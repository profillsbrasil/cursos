"use client";

import { useUser } from "@clerk/nextjs";

import { CabecalhoDaMinhaConta, EsqueletoDaMinhaConta } from "./esqueleto";
import { SecaoDaEntrada } from "./secao-da-entrada";
import { SecaoDaSenha } from "./secao-da-senha";
import { SecaoDeSair } from "./secao-de-sair";
import { SecaoDoNome } from "./secao-do-nome";
import { SecaoDosAparelhos } from "./secao-dos-aparelhos";
import type { FolhaDaConta } from "./tipos";

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
    <>
      <CabecalhoDaMinhaConta />
      <div className="@container grid gap-[18px]">
        <SecaoDoNome
          certificados={certificados}
          folha={folha}
          key={user.id}
          user={user}
        />
        <div className="grid @min-[48rem]:grid-cols-2 items-start gap-[18px]">
          <SecaoDaEntrada user={user} />
          <SecaoDaSenha user={user} />
          <div className="@min-[48rem]:col-span-2 grid min-w-0">
            <SecaoDosAparelhos user={user} />
          </div>
        </div>
        <SecaoDeSair certificados={certificados} user={user} />
      </div>
    </>
  );
}
