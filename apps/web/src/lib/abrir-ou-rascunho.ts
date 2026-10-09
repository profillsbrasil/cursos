import { z } from "zod";

const UUID = z.uuid();

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
