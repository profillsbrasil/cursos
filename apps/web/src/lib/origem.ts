/**
 * multipart/form-data é um pedido "simples" de CORS: o browser manda de outro site
 * sem preflight, com o cookie de sessão do Clerk. O tRPC aceita esse corpo em
 * admin.catalogo.salvarCurso, então o multipart só passa vindo da própria origem.
 * JSON exige preflight, e o CORS já o barra.
 */
export function recusaDeOrigem(req: Request, origem: string): Response | null {
  const multipart = req.headers
    .get("content-type")
    ?.startsWith("multipart/form-data");
  if (!multipart || req.headers.get("origin") === origem) {
    return null;
  }
  return new Response("Origem não permitida.", { status: 403 });
}
