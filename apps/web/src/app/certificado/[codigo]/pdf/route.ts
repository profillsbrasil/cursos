import { origemDoPedido } from "@/components/certificado/folha";
import { respostaDoPdf } from "@/components/certificado/resposta-do-pdf";
import { conferirCertificado } from "@/server/api";

export async function GET(
  pedido: Request,
  { params }: RouteContext<"/certificado/[codigo]/pdf">
) {
  return respostaDoPdf(
    await conferirCertificado((await params).codigo),
    origemDoPedido(pedido.headers)
  );
}
