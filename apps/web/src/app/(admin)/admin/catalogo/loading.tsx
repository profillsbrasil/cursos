import { Skeleton } from "@cursos/ui/components/skeleton";

import { GRADE_DO_CATALOGO } from "@/components/admin/grade-do-catalogo";

const PULSO = "bg-card motion-reduce:animate-none";

// O cabeçalho e as capas na mesma grade da página, enquanto o banco responde.
export default function Carregando() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Carregando o catálogo</span>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-x-5 gap-y-3.5">
        <div className="grid gap-2">
          <Skeleton className={`${PULSO} h-9 w-44 rounded-lg`} />
          <Skeleton className={`${PULSO} h-5 w-64 rounded-lg`} />
        </div>
        <Skeleton className={`${PULSO} h-11 w-36 rounded-full`} />
      </div>
      <div className={GRADE_DO_CATALOGO}>
        {["a", "b", "c", "d", "e", "f"].map((capa) => (
          <div className="grid content-start gap-3" key={capa}>
            <Skeleton className={`${PULSO} aspect-[900/604] rounded-[14px]`} />
            <Skeleton className={`${PULSO} h-5 w-3/4 rounded-lg`} />
            <Skeleton className={`${PULSO} h-4 w-1/2 rounded-lg`} />
          </div>
        ))}
      </div>
    </div>
  );
}
