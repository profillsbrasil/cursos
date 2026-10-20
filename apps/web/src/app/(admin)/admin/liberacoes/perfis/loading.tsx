import {
  EsqueletoDaSecao,
  EsqueletoDaTrilha,
} from "@/components/admin/esqueletos";
import { EsqueletoDoCabecalho } from "@/components/casca/cabecalho-da-pagina";

// A aba Por perfil: as abas e a seção dos cursos, uma linha por curso.
export default function Carregando() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Carregando os cursos por perfil</span>
      <EsqueletoDoCabecalho />
      <EsqueletoDaTrilha className="mb-7 max-w-[13.5rem]" />
      <EsqueletoDaSecao altura="h-[64px]" linhas={6} />
    </div>
  );
}
