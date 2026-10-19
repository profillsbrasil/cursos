import { abrirCapa } from "@/server/api";

/** A chave é o hash dos bytes: a mesma URL nunca muda de imagem. */
export async function GET(
  _req: Request,
  { params }: RouteContext<"/capa/[chave]">
) {
  const capa = await abrirCapa((await params).chave);
  if (!capa) {
    return new Response(null, { status: 404 });
  }
  return new Response(capa.body, {
    headers: {
      "cache-control": "public, max-age=31536000, immutable",
      "content-type":
        capa.headers.get("content-type") ?? "application/octet-stream",
    },
  });
}
