import type { TrilhaVM } from "@cursos/api/dominio/painel";
import { cn } from "@cursos/ui/lib/utils";
import { Check, Clock, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { BarraProgresso } from "./barra-progresso";
import { SeloEstado } from "./selo-estado";

const CARTAO =
  "grid grid-cols-[112px_minmax(0,1fr)] items-center gap-4 rounded-lg bg-card p-(--pad) text-card-foreground ring-1 ring-border [--pad:16px] max-[760px]:grid-cols-[88px_minmax(0,1fr)] max-[760px]:gap-3";

function LinhaDaVez({ trilha }: { trilha: TrilhaVM }) {
  const { daVez } = trilha;
  if (daVez) {
    return (
      <>
        <Play
          aria-hidden="true"
          className="size-[15px] fill-current text-ceu"
        />
        Agora: <b className="font-semibold text-foreground">{daVez.titulo}</b>
        {daVez.temNiveis && daVez.moduloAtual
          ? ` · Módulo ${daVez.moduloAtual.numero}`
          : null}
        <SeloEstado estado={daVez.estado} />
      </>
    );
  }
  if (trilha.situacao === "concluida") {
    return (
      <>
        <Check aria-hidden="true" className="size-[15px] text-ceu" />
        Trilha concluída
      </>
    );
  }
  return (
    <>
      <Clock aria-hidden="true" className="size-[15px] text-ceu" />
      Os próximos cursos estão em produção
    </>
  );
}

// O cartão é link para o curso da vez; sem curso da vez, não é link. Sem aria-label:
// o leitor lê o conteúdo (título, progresso, "Agora:" e o selo com o estado real).
export function CartaoTrilha({ trilha }: { trilha: TrilhaVM }) {
  const [primeiro] = trilha.cursos;
  const conteudo = (
    <>
      <div className="relative aspect-video overflow-hidden rounded-sm bg-sidebar">
        {primeiro ? (
          <Image
            alt={primeiro.capa.alt}
            className="object-cover"
            fill
            sizes="112px"
            src={primeiro.capa.url}
          />
        ) : null}
      </div>
      <div className="min-w-0">
        <h3 className="mb-2 font-semibold text-base text-titulo">
          {trilha.titulo}
        </h3>
        <BarraProgresso
          pct={trilha.aulas.pct}
          rotulo={`Aulas assistidas na trilha ${trilha.titulo}`}
        />
        <p className="mt-2 flex justify-between gap-2 text-[13px] text-muted-foreground tabular-nums">
          <span>
            <b className="font-semibold text-foreground">
              {trilha.concluidos} de {trilha.cursos.length}
            </b>{" "}
            {trilha.cursos.length === 1 ? "curso" : "cursos"}
          </span>
          <span>{trilha.aulas.pct}% das aulas</span>
        </p>
      </div>
      {/* Divisória de borda a borda: margem negativa igual ao padding do cartão. */}
      <p className="col-span-full -mx-(--pad) flex flex-wrap items-center gap-2 border-border border-t px-(--pad) pt-3 text-[13px] text-muted-foreground">
        <LinhaDaVez trilha={trilha} />
      </p>
    </>
  );
  if (!trilha.daVez) {
    return <div className={CARTAO}>{conteudo}</div>;
  }
  return (
    <Link
      className={cn(
        CARTAO,
        "transition-shadow hover:ring-ceu focus-visible:outline-2 focus-visible:outline-ceu focus-visible:outline-solid focus-visible:outline-offset-2"
      )}
      href={`/cursos/${trilha.daVez.slug}`}
    >
      {conteudo}
    </Link>
  );
}
