import type { Retomada } from "@cursos/api/dominio/painel";
import { buttonVariants } from "@cursos/ui/components/button";
import { cn } from "@cursos/ui/lib/utils";
import { Award, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { dimensoesDaCapa } from "@/lib/capas";
import { fmtMin } from "@/lib/formato";

import { BarraProgresso } from "./barra-progresso";

const CARTAO =
  "overflow-hidden rounded-[20px] bg-card text-card-foreground ring-1 ring-border";
const BOTAO = cn(
  buttonVariants(),
  "h-11 gap-2 self-start rounded-full px-5 font-semibold text-sm focus-visible:outline-2 focus-visible:outline-ceu focus-visible:outline-solid focus-visible:outline-offset-2 max-[760px]:self-stretch"
);

function Capa({ capa }: { capa: { alt: string; url: string } }) {
  const { height, width } = dimensoesDaCapa(capa.url);
  return (
    // A capa é uma peça com logo e texto: aparece inteira, e a mesma imagem desfocada preenche a sobra.
    <div className="relative grid place-items-center overflow-hidden bg-sidebar max-[760px]:order-first">
      <Image
        alt=""
        aria-hidden="true"
        className="scale-110 object-cover blur-[24px] brightness-[.85] saturate-[1.15]"
        fill
        sizes="44vw"
        src={capa.url}
      />
      <Image
        alt={capa.alt}
        className="relative h-auto w-full"
        height={height}
        preload
        sizes="(max-width: 760px) 100vw, 44vw"
        src={capa.url}
        width={width}
      />
    </div>
  );
}

function Progresso({
  feitas,
  pct,
  titulo,
  total,
}: {
  feitas: number;
  pct: number;
  titulo: string;
  total: number;
}) {
  return (
    <>
      <BarraProgresso
        className="h-2.5"
        pct={pct}
        rotulo={`Progresso do curso ${titulo}`}
      />
      <p className="text-muted-foreground text-sm tabular-nums">
        <b className="font-semibold text-titulo">{pct}%</b> do curso, {feitas}{" "}
        de {total} aulas
      </p>
    </>
  );
}

export function BannerContinuar({ retomada }: { retomada: Retomada | null }) {
  if (!retomada) {
    return (
      <section
        aria-labelledby="banner-titulo"
        className={cn(
          CARTAO,
          "grid content-center gap-3 p-[clamp(22px,3.4vw,36px)]"
        )}
      >
        <h2
          className="font-bold text-[clamp(24px,2.6vw,32px)] text-titulo leading-tight tracking-tight"
          id="banner-titulo"
        >
          Tudo em dia
        </h2>
        <p className="max-w-[60ch] text-muted-foreground">
          Você não tem aula pendente nos cursos liberados. Quando uma trilha
          nova for liberada para você, ela aparece aqui.
        </p>
      </section>
    );
  }
  const onde = retomada.trilha?.titulo ?? retomada.curso.titulo;
  const href = `/cursos/${retomada.curso.slug}` as const;
  return (
    <section
      aria-labelledby="banner-titulo"
      className={cn(
        CARTAO,
        "grid min-[761px]:grid-cols-[minmax(0,1fr)_minmax(0,44%)]"
      )}
    >
      <div className="flex min-w-0 flex-col gap-3.5 p-[clamp(22px,3.4vw,36px)]">
        <h2
          className="font-bold text-[clamp(24px,2.6vw,32px)] text-titulo leading-[1.15] tracking-tight"
          id="banner-titulo"
        >
          {retomada.tipo === "prova" ? (
            <>
              Falta a prova
              <span className="block text-sol">{retomada.curso.titulo}</span>
            </>
          ) : (
            <>
              {retomada.modulo.titulo} · Aula {retomada.aula.numeroNoModulo}
              <span className="block text-sol">{retomada.aula.titulo}</span>
            </>
          )}
        </h2>
        {retomada.tipo === "continuar" && (
          <>
            <p>
              {onde} · Módulo {retomada.modulo.numero}. Faltam{" "}
              <b className="font-semibold text-titulo">
                {fmtMin(retomada.aula.faltaSeg)}
              </b>{" "}
              desta aula.
            </p>
            <Progresso {...retomada.progresso} titulo={retomada.curso.titulo} />
            {retomada.proximoNivel !== null && (
              <p className="flex items-center gap-1.5 text-muted-foreground text-sm">
                <Award aria-hidden="true" className="size-4 text-ceu" />
                Próximo nível:{" "}
                <b className="font-semibold text-titulo">
                  {retomada.proximoNivel}
                </b>
              </p>
            )}
          </>
        )}
        {retomada.tipo === "comecar" && (
          <p>
            {onde} · Módulo {retomada.modulo.numero}. Primeira aula do curso.
          </p>
        )}
        {retomada.tipo === "prova" && (
          <>
            <p>
              {onde}. Você assistiu a todas as aulas; a prova libera o
              certificado.
            </p>
            <Progresso {...retomada.progresso} titulo={retomada.curso.titulo} />
          </>
        )}
        <Link className={cn(BOTAO, "mt-1")} href={href}>
          <Play aria-hidden="true" className="fill-current" />
          {
            {
              comecar: "Começar curso",
              continuar: "Continuar aula",
              prova: "Ir para a prova",
            }[retomada.tipo]
          }
        </Link>
      </div>
      <Capa capa={retomada.curso.capa} />
    </section>
  );
}
