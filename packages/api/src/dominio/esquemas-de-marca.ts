import type { Marca } from "@cursos/db/marcas";
import { z } from "zod";

/**
 * O id do fio com a marca: z.uuid() sem mudar a caixa, e o predicado estreita a
 * saída. O abort deixa o uuid recusado sem o issue do predicado, e o erro fica o
 * do z.uuid() sozinho.
 */
export const idDe = <M extends Marca<string, string>>(
  eh: (s: string) => s is M
) => z.uuid({ abort: true }).refine(eh);

/** Como idDe, com o toLowerCase que o id de hoje já faz antes da marca. */
export const idMinusculoDe = <M extends Marca<string, string>>(
  eh: (s: string) => s is M
) =>
  z
    .uuid()
    .transform((s) => s.toLowerCase())
    .refine(eh);
