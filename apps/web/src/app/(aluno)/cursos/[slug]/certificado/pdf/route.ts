import { origemDoPedido } from "@/components/certificado/folha";
import {
  certificadoDaPagina,
  respostaDoPdf,
} from "@/components/certificado/resposta-do-pdf";
import { carregarPaginaDoCertificado } from "@/server/api";

export async function GET(
  pedido: Request,
  { params }: RouteContext<"/cursos/[slug]/certificado/pdf">
) {
  const pagina = await carregarPaginaDoCertificado((await params).slug);

  return await respostaDoPdf(
    certificadoDaPagina(pagina),
    origemDoPedido(pedido.headers)
  );
}
