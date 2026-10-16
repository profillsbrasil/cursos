import { CartaoContinuar } from "@/components/aluno/cartao-continuar";
import { continuarDe } from "@/components/aluno/continuar";
import { AREA_DO_ADMIN, ITENS_DO_ALUNO } from "@/components/aluno/menu";
import { Casca } from "@/components/casca/casca";
import {
  carregarPainel,
  carregarResumo,
  paraACasca,
  souAdmin,
} from "@/server/api";

// Conteúdo em largura total: nenhum ancestral do conteúdo tem max-width, container ou mx-auto.
export default async function LayoutDoAluno({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // await: auth.protect() redireciona aqui, antes de a casca pedir qualquer dado.
  const admin = await souAdmin();
  // Sem await: o cartão chega por streaming. Em /meus-cursos, React.cache faz o
  // layout e a página dividirem uma execução do painel.
  const continuar = paraACasca(
    "continuar",
    carregarPainel().then((p) => continuarDe(p.retomada))
  );
  // O cartão de conta recebe só o placar, não o resumo inteiro.
  const placar = paraACasca(
    "placar",
    carregarResumo().then(({ saldo, sequenciaDias }) => ({
      saldo,
      sequenciaDias,
    }))
  );
  return (
    <Casca
      itens={ITENS_DO_ALUNO}
      outraArea={admin ? AREA_DO_ADMIN : null}
      placar={placar}
      rodape={<CartaoContinuar cartao={continuar} />}
      rotulo="Navegação principal"
    >
      {children}
    </Casca>
  );
}
