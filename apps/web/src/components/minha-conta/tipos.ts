import type { useUser } from "@clerk/nextjs";
import type { FolhaDoCertificado } from "@/components/certificado/medidas-da-folha";

/** O usuário do Clerk como o `useUser()` entrega, já carregado. */
export type Usuario = NonNullable<ReturnType<typeof useUser>["user"]>;

export type EmailDaConta = Usuario["emailAddresses"][number];

export type SessaoComAtividade = Awaited<
  ReturnType<Usuario["getSessions"]>
>[number];

/** A folha do certificado ganho mais recente, ou a de exemplo para quem ainda não ganhou um. A tela troca só o nome. */
export interface FolhaDaConta {
  exemplo: boolean;
  folha: FolhaDoCertificado;
}
