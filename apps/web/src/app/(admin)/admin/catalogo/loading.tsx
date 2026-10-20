import { Skeleton } from "@cursos/ui/components/skeleton";

import { GRADE_DO_CATALOGO } from "@/components/admin/grade-do-catalogo";
import { EsqueletoDoCabecalho } from "@/components/casca/cabecalho-da-pagina";

const PULSO = "bg-card";

// O cabeçalho e as capas na mesma grade da página, enquanto o banco responde:
// a capa, o título com a categoria e o código embaixo, e a linha dos módulos.
export default function Carregando() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Carregando o catálogo</span>
      <EsqueletoDoCabecalho
        acao
        resumo="3 cursos, 2 publicados, 1 em produção"
        titulo="Catálogo"
      />
      <div className={GRADE_DO_CATALOGO}>
        {["a", "b", "c", "d", "e", "f"].map((capa) => (
          <div className="grid content-start gap-3" key={capa}>
            <Skeleton className={`${PULSO} aspect-[900/604] rounded-[14px]`} />
            <div className="grid">
              <Skeleton className={`${PULSO} h-[23px] w-3/4 rounded-lg`} />
              <Skeleton className={`${PULSO} h-5 w-1/2 rounded-lg`} />
            </div>
            <Skeleton className={`${PULSO} h-5 w-2/3 rounded-lg`} />
          </div>
        ))}
      </div>
    </div>
  );
}
