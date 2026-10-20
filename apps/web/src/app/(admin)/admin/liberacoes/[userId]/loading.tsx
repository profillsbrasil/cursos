import {
  EsqueletoDaSecao,
  EsqueletoDoTopoDaPessoa,
} from "@/components/admin/esqueletos";

// O acesso da pessoa: o topo, a seção das liberações e a de liberar curso.
export default function Carregando() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Carregando o acesso</span>
      <EsqueletoDoTopoDaPessoa />
      <div className="grid gap-10">
        <EsqueletoDaSecao altura="h-[112px]" linhas={3} />
        <EsqueletoDaSecao altura="h-[60px]" linhas={4} />
      </div>
    </div>
  );
}
