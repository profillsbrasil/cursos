import type {
  CertificadoEmitido,
  PaginaDoCertificado,
} from "@cursos/api/dominio/pagina-do-certificado";

import {
  comNome,
  enderecoDaConferencia,
  folhaDo,
  origemDoPedido,
} from "./folha";
import { pdfDaFolha } from "./pdf";

const certificadoDaPagina = (
  pagina: PaginaDoCertificado | null
): CertificadoEmitido | null =>
  pagina?.tipo === "emitido" ? pagina.certificado : null;

export async function respostaDoPdf(
  certificado: CertificadoEmitido | null,
  origem: string
): Promise<Response> {
  const comONome = comNome(certificado);

  if (!comONome) {
    return new Response("Certificado não encontrado.", { status: 404 });
  }

  const pdf = await pdfDaFolha(
    folhaDo(comONome, enderecoDaConferencia(origem, comONome.codigo))
  );

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="certificado-${comONome.codigo}.pdf"`,
      "Content-Type": "application/pdf",
    },
  });
}

/** O `GET` do PDF da página do aluno, com quem carrega a página por parâmetro: o `route.ts` passa o `carregarPaginaDoCertificado` de `@/server/api`. Só o certificado emitido tem PDF; a página do que falta, ou a que não abre, dá 404. */
export const rotaDoPdfDoAluno =
  (carregar: (slug: string) => Promise<PaginaDoCertificado | null>) =>
  async (
    pedido: Request,
    { params }: RouteContext<"/cursos/[slug]/certificado/pdf">
  ) =>
    await respostaDoPdf(
      certificadoDaPagina(await carregar((await params).slug)),
      origemDoPedido(pedido.headers)
    );

/** O `GET` do PDF da conferência pública, com quem confere o código por parâmetro: o `route.ts` passa o `conferirCertificado` de `@/server/api`. */
export const rotaDoPdfDaConferencia =
  (conferir: (codigo: string) => Promise<CertificadoEmitido | null>) =>
  async (
    pedido: Request,
    { params }: RouteContext<"/certificado/[codigo]/pdf">
  ) =>
    await respostaDoPdf(
      await conferir((await params).codigo),
      origemDoPedido(pedido.headers)
    );
