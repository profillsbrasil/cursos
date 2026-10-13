import type { Metadata } from "next";

import { ITENS_DO_ADMIN, VER_COMO_ALUNO } from "@/components/admin/menu";
import { Casca } from "@/components/casca/casca";
import { PRODUTO } from "@/lib/marca";
import { exigirAdmin } from "@/server/api";

// Um title em texto aqui cortaria o template da raiz para as páginas do admin.
export const metadata: Metadata = {
  title: { default: "Admin", template: `%s · ${PRODUTO}` },
};

// proxy.ts não tem regra por caminho: a porta é exigirAdmin aqui e em cada carregador,
// mais o adminProcedure em cada procedimento.
export default async function LayoutDoAdmin({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await exigirAdmin();
  return (
    <Casca
      itens={ITENS_DO_ADMIN}
      outraArea={VER_COMO_ALUNO}
      rotulo="Navegação do admin"
      selo="Admin"
    >
      {children}
    </Casca>
  );
}
