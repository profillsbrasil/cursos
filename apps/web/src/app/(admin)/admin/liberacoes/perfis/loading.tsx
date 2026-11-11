import {
  EsqueletoDaBarra,
  EsqueletoDoCartao,
} from "@/components/admin/esqueletos";
import { EsqueletoDoCabecalho } from "@/components/casca/cabecalho-da-pagina";

// A aba Por perfil: a barra com as abas e a contagem, e o cartão dos cursos,
// uma linha por curso. As duas abas somam 181 px.
export default function Carregando() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Carregando os cursos por perfil</span>
      <EsqueletoDoCabecalho
        resumo="Abra um curso a todo mundo de um perfil, inclusive a quem chegar depois"
        titulo="Liberações"
      />
      <EsqueletoDaBarra
        contagem="6 cursos, 2 liberados a todos"
        trilha="w-[181px]"
      />
      <EsqueletoDoCartao altura="h-[64px]" linhas={6} />
    </div>
  );
}
