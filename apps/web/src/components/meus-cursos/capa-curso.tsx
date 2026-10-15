import type { CursoVM } from "@cursos/api/dominio/painel";
import { cn } from "@cursos/ui/lib/utils";
import { Clock, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { fmtHoras, fmtNum, plural } from "@/lib/formato";

import { SeloEstado } from "./selo-estado";

export type Etiqueta =
  | { tipo: "duracao"; texto: string }
  | { tipo: "comece" }
  | { tipo: "em_producao" };

const aulasEDuracao = (c: CursoVM) =>
  `${plural(c.aulas, "aula", "aulas")} · ${fmtHoras(c.duracaoSeg)}`;

/**
 * A etiqueta sobre a imagem, como no protótipo aprovado: "Em produção" no curso em
 * produção, "Comece por aqui" no primeiro curso da trilha não iniciado e, nos
 * outros, as aulas e a duração do curso inteiro.
 */
function etiquetaDe(c: CursoVM, comece: boolean): Etiqueta {
  if (c.estado.tipo === "em_breve") {
    return { tipo: "em_producao" };
  }
  if (comece) {
    return { tipo: "comece" };
  }
  return { texto: aulasEDuracao(c), tipo: "duracao" };
}

const ESPACO_QUE_NAO_QUEBRA = " ";

/**
 * A linha sob o título, igual na trilha e nos cursos rápidos: o tema, o código ou
 * o destaque que o admin escreveu e o tamanho do curso inteiro. Com aula assistida,
 * "46 de 90 aulas"; sem, "3 aulas · 32 min". O curso em produção mostra o tema e o
 * código ou destaque, sem o tamanho, porque as aulas dele ainda mudam. O tamanho e
 * o "·" que junta as partes vão com espaços que não quebram: a linha quebra dentro
 * de uma parte, nunca em "2 de / 2 aulas" nem com um "·" sozinho na ponta.
 */
export function linhaDoCurso(c: CursoVM): string {
  const partes = [c.tema, c.extra];
  if (c.estado.tipo !== "em_breve" && c.aulas > 0) {
    const { feitas, total } = c.progresso;
    const tamanho =
      feitas > 0
        ? `${fmtNum(feitas)} de ${plural(total, "aula", "aulas")}`
        : aulasEDuracao(c);
    partes.push(tamanho.replaceAll(" ", ESPACO_QUE_NAO_QUEBRA));
  }
  return partes
    .filter((p) => p !== null && p !== "")
    .join(`${ESPACO_QUE_NAO_QUEBRA}·${ESPACO_QUE_NAO_QUEBRA}`);
}

/**
 * "Agora: Módulo 8, Pilar Urgência", só no curso em andamento dividido em níveis, a
 * mesma regra e a mesma grafia do "Módulo N" da linha "Agora:" da trilha. No curso
 * curto o módulo não diz nada que o título não diga.
 */
const moduloDeAgora = (c: CursoVM) =>
  c.estado.tipo === "em_andamento" && c.temNiveis ? c.moduloAtual : null;

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
    case "em_producao":
      return (
        <span className={cn(ETIQUETA, "bg-background text-ceu")}>
          <Clock aria-hidden="true" className="size-[13px]" />
          Em produção
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

/**
 * Grade das capas de Meus cursos: colunas de 250px ou mais, no máximo 3. A coluna
 * vazia fica (auto-fill), então a capa de uma trilha de um curso só mede o mesmo
 * que a de uma trilha de três, em vez de esticar até a largura toda.
 */
export const GRADE_CAPAS =
  "grid grid-cols-[repeat(auto-fill,minmax(min(100%,max(250px,(100%_-_36px)/3)),1fr))] gap-x-[18px] gap-y-[22px]";

/** sizes de toda capa da GRADE_CAPAS: com no máximo 3 colunas, a conta é a de 3 capas. */
export const SIZES_DA_GRADE = sizesDaCapa(3);

// Link quando o estado abre o curso; div aria-disabled em em_breve e bloqueado.
export function CapaCurso({
  curso,
  comece = false,
  ordem,
  sizes,
}: {
  curso: CursoVM;
  /** "Comece por aqui" no lugar das aulas e da duração: o primeiro curso da trilha, não iniciado. */
  comece?: boolean;
  /**
   * Número do curso na trilha. Fica na árvore de acessibilidade: o `ol` sem marcador
   * não tem número falado, e o leitor de tela ouve "1", "2", "3" deste círculo.
   */
  ordem?: number;
  sizes: string;
}) {
  const fechado =
    curso.estado.tipo === "em_breve" || curso.estado.tipo === "bloqueado";
  const agora = moduloDeAgora(curso);
  const titulo = (
    <h3
      className={cn(
        "font-semibold text-lg text-titulo leading-[1.3] transition-colors",
        !fechado && "group-hover:text-sol"
      )}
    >
      {curso.titulo}
    </h3>
  );
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
            "object-cover transition-transform duration-200 ease-forte motion-reduce:transition-none",
            fechado ? "opacity-55 saturate-[.6]" : "group-hover:scale-[1.03]"
          )}
          fill
          sizes={sizes}
          src={curso.capa.url}
        />
        <TextoEtiqueta etiqueta={etiquetaDe(curso, comece)} />
      </div>
      {ordem === undefined ? (
        titulo
      ) : (
        <div className="flex items-start gap-2.5">
          <span className="mt-px inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-popover font-semibold text-foreground text-xs tabular-nums">
            {ordem}
          </span>
          {titulo}
        </div>
      )}
      <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[13px] text-muted-foreground">
        <span>{linhaDoCurso(curso)}</span>
        {curso.estado.tipo !== "em_breve" && (
          <SeloEstado estado={curso.estado} />
        )}
      </p>
      {agora && (
        <p className="text-[13px] text-muted-foreground">
          Agora:{" "}
          <b className="font-semibold text-foreground">
            Módulo {agora.numero}, {agora.titulo}
          </b>
        </p>
      )}
      {/* O motivo do bloqueio fica visível: a capa bloqueada não recebe foco nem tem dica no toque. */}
      {curso.estado.tipo === "bloqueado" && (
        <p className="text-[13px] text-muted-foreground">
          Abre depois de{" "}
          <b className="font-semibold text-foreground">
            {curso.estado.liberadoPor.titulo}
          </b>
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
    // O foco de teclado acende o cartão como o cursor: anel Céu, capa e título (#30).
    <Link className={cn(base, "group")} href={`/cursos/${curso.slug}`}>
      {conteudo}
    </Link>
  );
}
