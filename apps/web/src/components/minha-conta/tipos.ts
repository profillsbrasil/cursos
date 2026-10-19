import type { useUser } from "@clerk/nextjs";

/** O usuário do Clerk como o `useUser()` entrega, já carregado. */
export type Usuario = NonNullable<ReturnType<typeof useUser>["user"]>;

export type EmailDaConta = Usuario["emailAddresses"][number];

export type SessaoComAtividade = Awaited<
  ReturnType<Usuario["getSessions"]>
>[number];
