import { CartaoContinuar } from "@/components/aluno/cartao-continuar";
import { continuarDe } from "@/components/aluno/continuar";
import { AREA_DO_ADMIN, ITENS_DO_ALUNO } from "@/components/aluno/menu";
import { Casca } from "@/components/casca/casca";
import { ProvedorDoClerk } from "@/components/provedor-do-clerk";
import {
  carregarPainel,
  carregarResumo,
  paraACasca,
  souAdmin,
} from "@/server/api";

/** Conteúdo em largura total: nenhum ancestral do conteúdo tem max-width, container ou mx-auto. */
export default async function LayoutDoAluno({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // WARNING: com await, para o auth.protect() redirecionar aqui, antes de a casca pedir qualquer dado.
  const admin = await souAdmin();

  // WARNING: sem await, para o cartão chegar por streaming; em /meus-cursos, React.cache faz o layout e a página dividirem uma execução do painel.
  const continuar = paraACasca(
    "continuar",
    carregarPainel().then((p) => continuarDe(p.retomada))
  );

  const placar = paraACasca(
    "placar",
    carregarResumo().then(({ saldo, sequenciaDias }) => ({
      saldo,
      sequenciaDias,
    }))
  );

  return (
    <ProvedorDoClerk>
      <Casca
        itens={ITENS_DO_ALUNO}
        outraArea={admin ? AREA_DO_ADMIN : null}
        placar={placar}
        rodape={<CartaoContinuar cartao={continuar} />}
        rotulo="Navegação principal"
      >
        {children}
      </Casca>
    </ProvedorDoClerk>
  );
}
