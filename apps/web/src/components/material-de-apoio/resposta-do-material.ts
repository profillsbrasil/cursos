// O corpo da rota app/material/[id]: o arquivo como anexo, ou 404.

import { disposicaoDoAnexo } from "@/lib/anexo";

export interface MaterialAberto {
  contentType: string;
  nomeDoArquivo: string;
  /** A resposta do bucket, com o corpo do arquivo. */
  resposta: Response;
}

/**
 * Para quem não pode ver e para o id que não existe, o mesmo 404, sem dizer qual
 * dos dois. A capa é pública; o material não. Nem o navegador guarda: com cache,
 * quem saiu da conta ou perdeu a liberação ainda abria o arquivo pela mesma URL.
 */
export function respostaDoMaterial(aberto: MaterialAberto | null): Response {
  if (!aberto) {
    return new Response(null, { status: 404 });
  }
  const { contentType, nomeDoArquivo, resposta } = aberto;
  const headers = new Headers({
    "cache-control": "private, no-store",
    "content-disposition": disposicaoDoAnexo(nomeDoArquivo),
    "content-type": contentType,
  });
  const tamanho = resposta.headers.get("content-length");
  if (tamanho) {
    headers.set("content-length", tamanho);
  }
  return new Response(resposta.body, { headers });
}
