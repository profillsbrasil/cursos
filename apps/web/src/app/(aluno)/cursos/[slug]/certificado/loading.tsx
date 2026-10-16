import { Skeleton } from "@cursos/ui/components/skeleton";

import { TopoDoAluno } from "@/components/aluno/topo";
import { GRADE_DO_CERTIFICADO } from "@/components/certificado/tela-do-certificado";

const PULSO = "bg-card motion-reduce:animate-none";

export default function CarregandoCertificado() {
  return (
    <>
      <TopoDoAluno
        esquerda={<Skeleton className={`${PULSO} h-5 w-80 rounded-md`} />}
      />
      <span className="sr-only">Carregando o certificado</span>
      <Skeleton className={`${PULSO} h-9 w-64 rounded-lg`} />
      <div aria-busy="true" className={GRADE_DO_CERTIFICADO}>
        <Skeleton className={`${PULSO} aspect-[1123/794] rounded-[6px]`} />
        <Skeleton className={`${PULSO} h-[440px] rounded-[20px]`} />
      </div>
    </>
  );
}
