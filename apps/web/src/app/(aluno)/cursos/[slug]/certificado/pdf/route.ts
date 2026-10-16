import { origemDoPedido } from "@/components/certificado/folha";
import { respostaDoPdf } from "@/components/certificado/resposta-do-pdf";
import { carregarPaginaDoCertificado } from "@/server/api";

export async function GET(
  pedido: Request,
  { params }: RouteContext<"/cursos/[slug]/certificado/pdf">
) {
  const pagina = await carregarPaginaDoCertificado((await params).slug);
  return respostaDoPdf(
    pagina?.tipo === "emitido" ? pagina.certificado : null,
    origemDoPedido(pedido.headers)
  );
}
