import { Skeleton } from "@cursos/ui/components/skeleton";

import { CabecalhoDosComunicados } from "@/components/comunicados-do-aluno/tela-de-comunicados";

const PULSO = "bg-card motion-reduce:animate-none";

export default function Carregando() {
  return (
    <>
      <CabecalhoDosComunicados subtitulo={null} />
      <div aria-busy="true" className="grid gap-10">
        <span className="sr-only">Carregando os comunicados</span>
        <Skeleton className={`${PULSO} h-[232px] rounded-[20px]`} />
        <div className="grid gap-3.5">
          <Skeleton className={`${PULSO} h-8 w-48 rounded-lg`} />
          <Skeleton className={`${PULSO} h-[420px] rounded-[20px]`} />
        </div>
      </div>
    </>
  );
}
