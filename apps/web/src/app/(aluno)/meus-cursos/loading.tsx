import { Skeleton } from "@cursos/ui/components/skeleton";

import { EsqueletoDoCabecalho } from "@/components/casca/cabecalho-da-pagina";
import { GRADE_CAPAS } from "@/components/meus-cursos/capa-curso";

const PULSO = "bg-card";

// Esqueleto no formato do cabeçalho, do banner, da semana e da seção dos cursos:
// o resumo de exemplo pulsa no lugar da contagem, e as capas ficam na mesma grade
// da página.
export default function Carregando() {
  return (
    <>
      <EsqueletoDoCabecalho
        resumo="3 cursos liberados para você"
        titulo="Meus cursos"
      />
      <div aria-busy="true" className="grid gap-10 max-[760px]:gap-8">
        <span className="sr-only">Carregando seus cursos</span>
        <div className="grid gap-5 min-[1181px]:grid-cols-[minmax(0,1fr)_320px]">
          <Skeleton className={`${PULSO} h-[360px] rounded-[20px]`} />
          <Skeleton className={`${PULSO} h-[360px] rounded-[20px]`} />
        </div>
        <div>
          <Skeleton className={`${PULSO} mb-3.5 h-7 w-52 rounded-lg`} />
          <div className={GRADE_CAPAS}>
            <Skeleton className={`${PULSO} aspect-video rounded-lg`} />
            <Skeleton className={`${PULSO} aspect-video rounded-lg`} />
            <Skeleton className={`${PULSO} aspect-video rounded-lg`} />
          </div>
        </div>
      </div>
    </>
  );
}
