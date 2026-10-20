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

/**
 * O topo da ficha e do acesso: a volta à lista, a foto de 40 px, o nome, o
 * e-mail e, no acesso, a linha de 20 px do "Perfil e papel".
 */
export function EsqueletoDoTopoDaPessoa({
  comLink = false,
}: {
  comLink?: boolean;
}) {
  return (
    <>
      <Skeleton className={cn(PULSO, "mb-5 h-10 w-28 rounded-full")} />
      <div className="mb-7 flex items-center gap-4">
        <Skeleton className={cn(PULSO, "size-14 shrink-0 rounded-full")} />
        <div className="grid gap-1">
          <Skeleton className={cn(PULSO, "h-9 w-56 rounded-lg")} />
          <Skeleton className={cn(PULSO, "h-6 w-64 rounded-lg")} />
          {comLink ? (
            <Skeleton className={cn(PULSO, "h-5 w-24 rounded-lg")} />
          ) : null}
        </div>
      </div>
    </>
  );
}

/**
 * O editor do curso: o título a 28 px da capa, os cartões das seções e, de
 * 960 px de formulário para cima, a coluna de publicação. O cartão da capa
 * repete a grade da `CapaEDescricao`: abaixo de 768 px de cartão, a capa 3:2
 * fica sobre os campos, e a altura dele acompanha a largura como a do pronto.
 * Abaixo de 448 px de cartão, a legenda da capa e o endereço do curso quebram
 * em duas linhas, e o esqueleto ganha a altura delas.
 * O que você vai aprender repete a grade dos tópicos, com cinco: em duas
 * colunas só a partir de 768 px de cartão, como a do pronto.
 */
export function EsqueletoDoEditor() {
  return (
    <div aria-busy="true" className="@container">
      <span className="sr-only">Carregando o curso</span>
      <div className="grid @min-[960px]:grid-cols-[minmax(0,1fr)_300px] items-start gap-8">
        <div className="grid gap-10">
          <div className="grid gap-7">
            <Skeleton className={cn(PULSO, "h-9 w-72 max-w-full rounded-lg")} />
            <Skeleton className={cn(PULSO, "@container rounded-[20px]")}>
              <div className="grid @3xl:grid-cols-[clamp(280px,28cqw,440px)_minmax(0,1fr)] gap-7 p-6">
                <div className="grid content-start">
                  <div className="aspect-[3/2]" />
                  <div className="@3xl:h-[68px] @md:h-[50px] h-[68px]" />
                </div>
                <div className="@md:h-[364px] h-[384px]" />
              </div>
            </Skeleton>
          </div>
          <div className="grid gap-3.5">
            <Skeleton className={cn(PULSO, "h-8 w-40 rounded-lg")} />
            <Skeleton className={cn(PULSO, "rounded-[20px]")}>
              <div className="@container grid gap-4 p-5">
                <div className="grid @3xl:grid-cols-2 gap-x-7 gap-y-2.5">
                  {LINHAS.slice(0, 5).map((linha) => (
                    <div className="h-11" key={linha} />
                  ))}
                </div>
                <div className="h-9" />
              </div>
            </Skeleton>
          </div>
          <EsqueletoDaSecao altura="h-[144px]" linhas={1} />
        </div>
        <div className="grid @max-[960px]:hidden gap-3.5">
          <Skeleton className={cn(PULSO, "h-[232px] rounded-[20px]")} />
          <Skeleton className={cn(PULSO, "h-[266px] rounded-[20px]")} />
          <Skeleton className={cn(PULSO, "h-[294px] rounded-[20px]")} />
        </div>
      </div>
    </div>
  );
}
