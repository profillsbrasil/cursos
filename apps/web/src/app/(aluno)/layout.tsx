import { AREA_DO_ADMIN, ITENS_DO_ALUNO } from "@/components/aluno/menu";
import { Casca } from "@/components/casca/casca";
import { souAdmin } from "@/server/api";

// Conteúdo em largura total: nenhum ancestral do conteúdo tem max-width, container ou mx-auto.
export default async function LayoutDoAluno({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // await: auth.protect() redireciona aqui, antes de a casca pedir qualquer dado.
  const admin = await souAdmin();
  return (
    <Casca
      itens={ITENS_DO_ALUNO}
      outraArea={admin ? AREA_DO_ADMIN : null}
      rotulo="Navegação principal"
    >
      {children}
    </Casca>
  );
}
