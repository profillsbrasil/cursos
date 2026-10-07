import type { CursoVM } from "@cursos/api/dominio/painel";
import { cn } from "@cursos/ui/lib/utils";
import { Clock, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { SeloEstado } from "./selo-estado";

export type Etiqueta =
  | { tipo: "duracao"; texto: string }
  | { tipo: "comece" }
  | { tipo: "em_breve" };

const ETIQUETA =
  "absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold text-xs";

function TextoEtiqueta({ etiqueta }: { etiqueta: Etiqueta }) {
  switch (etiqueta.tipo) {
    case "comece":
      return (
        <span className={cn(ETIQUETA, "bg-sol text-sobre-cor")}>
          <Play aria-hidden="true" className="size-[13px] fill-current" />
          Comece por aqui
        </span>
      );
    case "em_breve":
      return (
        <span className={cn(ETIQUETA, "bg-background text-ceu")}>
          <Clock aria-hidden="true" className="size-[13px]" />
          Em breve
        </span>
      );
    case "duracao":
      return (
        <span className={cn(ETIQUETA, "bg-background text-foreground")}>
          {etiqueta.texto}
        </span>
      );
    default:
      return etiqueta satisfies never;
  }
}

/**
 * sizes da capa numa grade auto-fit de colunas de 250px ou mais, com `n` capas.
 * Acima de 768px o conteúdo mede cerca de 100vw menos a sidebar (248px) e o padding
 * (até 96px). Com 1 ou 2 capas a coluna estica até a largura toda ou a metade.
 */
export function sizesDaCapa(n: number) {
  const celular = "(max-width: 767px) 100vw";
  if (n === 1) {
    return `${celular}, calc(100vw - 300px)`;
  }
  const umaColuna = "(max-width: 861px) calc(100vw - 300px)";
  if (n === 2) {
    return `${celular}, ${umaColuna}, calc((100vw - 362px) / 2)`;
  }
  return `${celular}, ${umaColuna}, (max-width: 1147px) calc((100vw - 362px) / 2), calc((100vw - 380px) / 3)`;
}

// Link quando o estado abre o curso; div aria-disabled em em_breve e bloqueado.
export function CapaCurso({
  curso,
  etiqueta,
  meta,
  sizes,
}: {
  curso: CursoVM;
  etiqueta: Etiqueta;
  meta: string;
  /** Vem de sizesDaCapa, com o número de capas da grade. */
  sizes: string;
}) {
  const fechado =
    curso.estado.tipo === "em_breve" || curso.estado.tipo === "bloqueado";
  const conteudo = (
    <>
      <div
        className={cn(
          "relative aspect-video overflow-hidden rounded-lg bg-sidebar ring-1 ring-border transition-shadow",
          !fechado && "group-hover:ring-ceu"
        )}
      >
        <Image
          alt={curso.capa.alt}
          className={cn(
            "object-cover transition-transform duration-300 ease-out motion-reduce:transition-none",
            fechado ? "opacity-55 saturate-[.6]" : "group-hover:scale-[1.03]"
          )}
          fill
          sizes={sizes}
          src={curso.capa.url}
        />
        <TextoEtiqueta etiqueta={etiqueta} />
      </div>
      <h3
        className={cn(
          "font-semibold text-[17px] text-titulo transition-colors",
          !fechado && "group-hover:text-sol"
        )}
      >
        {curso.titulo}
      </h3>
      <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[13px] text-muted-foreground">
        <span>{meta}</span>
        {curso.estado.tipo !== "em_breve" && (
          <SeloEstado estado={curso.estado} />
        )}
      </p>
      {/* O motivo do bloqueio fica visível: a capa bloqueada não recebe foco nem tem dica no toque. */}
      {curso.estado.tipo === "bloqueado" && (
        <p className="text-[13px] text-muted-foreground">
          Abre quando você concluir {curso.estado.liberadoPor.titulo}
        </p>
      )}
    </>
  );
  const base = "grid content-start gap-2.5 rounded-lg";
  if (fechado) {
    return (
      <div aria-disabled="true" className={base}>
        {conteudo}
      </div>
    );
  }
  return (
    <Link
      className={cn(
        base,
        "group focus-visible:outline-2 focus-visible:outline-ceu focus-visible:outline-solid focus-visible:outline-offset-4"
      )}
      href={`/cursos/${curso.slug}`}
    >
      {conteudo}
    </Link>
  );
}
