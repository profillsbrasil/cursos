import { Skeleton } from "@cursos/ui/components/skeleton";

import { CabecalhoDaPagina } from "@/components/aluno/cabecalho-da-pagina";

const PULSO = "rounded-[20px] bg-card";

export function CabecalhoDaMinhaConta() {
  return (
    <CabecalhoDaPagina
      resumo="Seu nome, como você entra e os aparelhos com a conta aberta."
      titulo="Minha conta"
    />
  );
}

/** O lugar das seções enquanto a conta chega, na grade da página pronta. */
export function EsqueletoDaMinhaConta() {
  return (
    <>
      <CabecalhoDaMinhaConta />
      <div aria-busy="true" className="@container grid gap-[18px]">
        <span className="sr-only">Carregando sua conta</span>
        <Skeleton className={`${PULSO} @min-[48rem]:h-[330px] h-[420px]`} />
        <div className="grid @min-[48rem]:grid-cols-2 items-start gap-[18px]">
          <Skeleton className={`${PULSO} h-[250px]`} />
          <Skeleton className={`${PULSO} h-[180px]`} />
        </div>
        <Skeleton className={`${PULSO} h-[260px]`} />
      </div>
    </>
  );
}
