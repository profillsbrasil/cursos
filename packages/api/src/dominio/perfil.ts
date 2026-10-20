import type { PERFIS } from "@cursos/db/schema/formatos";

export type Perfil = (typeof PERFIS)[number];

/** Só o e-mail verificado conta: com o e-mail por verificar, qualquer um digitaria o domínio. */
export const DOMINIO_DA_EMPRESA = "@profills.com";

/** O perfil de quem entra no app pela primeira vez. Sem conta no Clerk, é público aberto. */
export function perfilDoCadastro(
  conta: { email: string | null; emailVerificado: boolean } | null
): Perfil {
  const email = conta?.emailVerificado ? conta.email?.toLowerCase() : null;
  return email?.endsWith(DOMINIO_DA_EMPRESA) ? "funcionario" : "publico";
}
