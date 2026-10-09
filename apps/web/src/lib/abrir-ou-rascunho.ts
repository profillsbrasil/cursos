import { z } from "zod";

const UUID = z.uuid();

/**
 * O que a página [id] de um editor de documento abre. O banco vence: o ?novo=1
 * só vale para um id que ainda não existe (a aba duplicada, ou o primeiro
 * salvamento cuja resposta se perdeu, abrem o documento gravado). null: a página
 * responde 404, inclusive para id fora do formato que o router aceita.
 */
export async function abrirOuRascunho<T>(
  { id, novo }: { id: string; novo: string | string[] | undefined },
  {
    carregar,
    rascunho,
  }: {
    carregar: (id: string) => Promise<T | null>;
    /** Recebe o id em minúscula, como o Postgres devolve. */
    rascunho: (id: string) => T;
  }
): Promise<T | null> {
  if (!UUID.safeParse(id).success) {
    return null;
  }
  const salvo = await carregar(id);
  if (salvo !== null) {
    return salvo;
  }
  return novo === "1" ? rascunho(id.toLowerCase()) : null;
}
