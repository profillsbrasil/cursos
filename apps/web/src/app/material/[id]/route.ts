import { disposicaoDoAnexo } from "@/lib/anexo";
import { abrirMaterial } from "@/server/api";

/**
 * O material de apoio, para o admin e para quem a página do curso abre. Para os
 * outros, e para o id que não existe, 404, sem dizer qual dos dois. A capa é
 * pública; o material não: o cache fica só no navegador de quem baixou.
 */
export async function GET(
  _req: Request,
  { params }: RouteContext<"/material/[id]">
) {
  const aberto = await abrirMaterial((await params).id);
  if (!aberto) {
    return new Response(null, { status: 404 });
  }
  const { contentType, nomeDoArquivo, resposta } = aberto;
  const headers = new Headers({
    "cache-control": "private, max-age=3600",
    "content-disposition": disposicaoDoAnexo(nomeDoArquivo),
    "content-type": contentType,
  });
  const tamanho = resposta.headers.get("content-length");
  if (tamanho) {
    headers.set("content-length", tamanho);
  }
  return new Response(resposta.body, { headers });
}
