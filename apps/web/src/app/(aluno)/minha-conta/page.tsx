import type { Metadata } from "next";
import { headers } from "next/headers";

import {
  enderecoDaConferencia,
  folhaDeExemplo,
  folhaDo,
  origemDoPedido,
} from "@/components/certificado/folha";
import { TelaDaMinhaConta } from "@/components/minha-conta/tela-da-minha-conta";
import type { FolhaDaConta } from "@/components/minha-conta/tipos";
import { carregarConquistas, carregarPaginaDoCertificado } from "@/server/api";

export const metadata: Metadata = { title: "Minha conta" };

/** O QR sai aqui, no servidor: `folha.ts` traz o `uqr`, que não vai ao cliente. */
async function folhaDaConta(
  slug: string | undefined,
  origem: string
): Promise<FolhaDaConta> {
  const pagina = slug ? await carregarPaginaDoCertificado(slug) : null;
  if (pagina?.tipo !== "emitido") {
    return { exemplo: true, folha: folhaDeExemplo(origem) };
  }
  const { certificado } = pagina;
  return {
    exemplo: false,
    folha: folhaDo(
      { ...certificado, nome: certificado.nome ?? "" },
      enderecoDaConferencia(origem, certificado.codigo)
    ),
  };
}

export default async function PaginaDaMinhaConta() {
  const [{ certificados }, cabecalhos] = await Promise.all([
    carregarConquistas(),
    headers(),
  ]);
  const ganhos = certificados.filter((c) => c.estado === "ganha");
  return (
    <TelaDaMinhaConta
      certificados={ganhos.length}
      folha={
        await folhaDaConta(
          ganhos.at(-1)?.curso.slug,
          origemDoPedido(cabecalhos)
        )
      }
    />
  );
}
