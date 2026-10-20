import { Skeleton } from "@cursos/ui/components/skeleton";
import { cn } from "@cursos/ui/lib/utils";

/**
 * As peças dos loading.tsx do admin, cada uma na altura da peça pronta, para
 * o conteúdo não pular quando a página chega.
 */
const PULSO = "bg-card";
const LINHAS = ["a", "b", "c", "d", "e", "f", "g", "h"];

/** A trilha das abas de Liberações e dos filtros: 36 px de opção e 4 px de folga. */
export function EsqueletoDaTrilha({ className }: { className?: string }) {
  return (
    <Skeleton
      className={cn(PULSO, "h-11 w-full max-w-[21rem] rounded-full", className)}
    />
  );
}

/** O campo de busca de 44 px com o Buscar ao lado. */
export function EsqueletoDaBusca({ className }: { className?: string }) {
  return (
    <div className={cn("flex gap-2.5", className)}>
      <Skeleton className={cn(PULSO, "h-11 flex-1 rounded-full")} />
      <Skeleton className={cn(PULSO, "h-11 w-[6.5rem] rounded-full")} />
    </div>
  );
}

/** A Secao do admin: o h2 de 32 px, 14 px de vão e o cartão de linhas. */
export function EsqueletoDaSecao({
  altura,
  linhas,
}: {
  altura: string;
  linhas: number;
}) {
  return (
    <div className="grid gap-3.5">
      <Skeleton className={cn(PULSO, "h-8 w-40 rounded-lg")} />
      <div className="grid gap-px overflow-hidden rounded-[20px] ring-1 ring-border">
        {LINHAS.slice(0, linhas).map((linha) => (
          <Skeleton className={cn(PULSO, altura, "rounded-none")} key={linha} />
        ))}
      </div>
    </div>
  );
}

/** O topo da ficha e do acesso: a volta à lista, a foto de 56 px, o nome e o e-mail. */
export function EsqueletoDoTopoDaPessoa() {
  return (
    <>
      <Skeleton className={cn(PULSO, "mb-5 h-10 w-28 rounded-full")} />
      <div className="mb-7 flex items-center gap-4">
        <Skeleton className={cn(PULSO, "size-14 shrink-0 rounded-full")} />
        <div className="grid gap-1">
          <Skeleton className={cn(PULSO, "h-9 w-56 rounded-lg")} />
          <Skeleton className={cn(PULSO, "h-6 w-64 rounded-lg")} />
        </div>
      </div>
    </>
  );
}

/**
 * O editor do curso: o título a 28 px da capa, os cartões das seções e, de
 * 960 px de formulário para cima, a coluna de publicação.
 */
export function EsqueletoDoEditor() {
  return (
    <div aria-busy="true" className="@container">
      <span className="sr-only">Carregando o curso</span>
      <div className="grid @min-[960px]:grid-cols-[minmax(0,1fr)_300px] items-start gap-8">
        <div className="grid gap-10">
          <div className="grid gap-7">
            <Skeleton className={cn(PULSO, "h-9 w-72 max-w-full rounded-lg")} />
            <Skeleton className={cn(PULSO, "h-[420px] rounded-[20px]")} />
          </div>
          <Skeleton className={cn(PULSO, "h-[260px] rounded-[20px]")} />
          <Skeleton className={cn(PULSO, "h-[480px] rounded-[20px]")} />
        </div>
        <div className="grid @max-[960px]:hidden gap-3.5">
          <Skeleton className={cn(PULSO, "h-[260px] rounded-[20px]")} />
          <Skeleton className={cn(PULSO, "h-[230px] rounded-[20px]")} />
          <Skeleton className={cn(PULSO, "h-[240px] rounded-[20px]")} />
        </div>
      </div>
    </div>
  );
}
