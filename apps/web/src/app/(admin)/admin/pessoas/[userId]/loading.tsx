import { Skeleton } from "@cursos/ui/components/skeleton";

import { EsqueletoDoTopoDaPessoa } from "@/components/admin/esqueletos";

// A ficha da pessoa: o topo e os cartões Acesso, Conta e Pontos, dois a dois no lg.
export default function Carregando() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Carregando a pessoa</span>
      <EsqueletoDoTopoDaPessoa />
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Skeleton className="h-[380px] rounded-[20px] bg-card" />
        <Skeleton className="h-[330px] rounded-[20px] bg-card" />
        <Skeleton className="h-[460px] rounded-[20px] bg-card" />
      </div>
    </div>
  );
}
