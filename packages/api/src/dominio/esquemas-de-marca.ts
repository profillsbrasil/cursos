import type { Marca } from "@cursos/db/marcas";
import { z } from "zod";

/** O id do fio com a marca: z.uuid() sem mudar a caixa, e o predicado estreita a saída. */
export const idDe = <M extends Marca<string, string>>(
  eh: (s: string) => s is M
) => z.uuid().refine(eh);

/** Como idDe, com o toLowerCase que o id de hoje já faz antes da marca. */
export const idMinusculoDe = <M extends Marca<string, string>>(
  eh: (s: string) => s is M
) =>
  z
    .uuid()
    .transform((s) => s.toLowerCase())
    .refine(eh);
