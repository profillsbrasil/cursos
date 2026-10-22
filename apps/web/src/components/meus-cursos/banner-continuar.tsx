import type { Retomada } from "@cursos/api/dominio/painel";
import type { Capa as CapaDoCurso } from "@cursos/api/dominio/tipos";
import { cn } from "@cursos/ui/lib/utils";
import { Flag, ListChecks, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { acaoDaRetomada } from "@/components/aluno/continuar";
import { BOTAO } from "@/components/casca/botoes";
import { CARTAO } from "@/components/casca/cartoes";
import { faltam, fmtMin, minutos, plural } from "@/lib/formato";
import { BarraProgresso } from "./barra-progresso";

const CARTAO_DO_BANNER = cn(CARTAO, "overflow-hidden text-card-foreground");
const BOTAO_DO_BANNER = cn(BOTAO, "self-start max-[760px]:self-stretch");

// Com o mesmo sizes, as duas imagens escolhem a mesma largura do srcset: a desfocada
// sai do cache da nítida, que tem preload, e não carrega lazy sendo o LCP da tela.
const SIZES_DA_CAPA = "(max-width: 760px) 100vw, 44vw";

function Capa({ capa }: { capa: CapaDoCurso }) {
  return (
    // A capa é uma peça com logo e texto: aparece inteira, e a mesma imagem desfocada preenche a sobra.
    <div className="relative grid place-items-center overflow-hidden bg-sidebar max-[760px]:order-first">
      <Image
        alt=""
        aria-hidden="true"
        className="scale-110 object-cover blur-[24px] brightness-[.85] saturate-[1.15]"
        fill
        loading="eager"
        sizes={SIZES_DA_CAPA}
        src={capa.url}
      />
      <Image
        alt={capa.alt}
        className="relative h-auto w-full"
        height={capa.altura}
        preload
        sizes={SIZES_DA_CAPA}
        src={capa.url}
        width={capa.largura}
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
        de {plural(total, "aula", "aulas")}
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
          CARTAO_DO_BANNER,
          "grid content-center gap-3 p-[clamp(22px,3.4vw,36px)]"
        )}
      >
        <h2
          className="font-bold text-[clamp(24px,2.6vw,32px)] text-titulo leading-tight tracking-tight"
          id="banner-titulo"
        >
          Tudo em dia
        </h2>
        <p className="text-muted-foreground">
          Você não tem aula pendente nos cursos liberados. Quando um curso novo
          for liberado para você, ele aparece aqui.
        </p>
      </section>
    );
  }
  const onde = retomada.curso.titulo;
  const acao = acaoDaRetomada(retomada);
  return (
    <section
      aria-labelledby="banner-titulo"
      className={cn(
        CARTAO_DO_BANNER,
        "grid min-[761px]:grid-cols-[minmax(0,1fr)_minmax(0,44%)]"
      )}
    >
      <div className="flex min-w-0 flex-col gap-3.5 p-[clamp(22px,3.4vw,36px)]">
        <h2
          className="font-bold text-[clamp(24px,2.6vw,32px)] text-titulo leading-[1.15] tracking-tight"
          id="banner-titulo"
        >
          {retomada.tipo === "questionario" ? (
            <>
              Questionário · Aula {retomada.aula.numeroNoModulo}
              <span className="block text-sol">{retomada.aula.titulo}</span>
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
              {onde} · Módulo {retomada.modulo.numero}.{" "}
              {faltam(minutos(retomada.aula.faltaSeg))}{" "}
              <b className="whitespace-nowrap font-semibold text-titulo">
                {fmtMin(retomada.aula.faltaSeg)}
              </b>{" "}
              desta aula.
            </p>
            <Progresso {...retomada.progresso} titulo={retomada.curso.titulo} />
            {retomada.proximoNivel !== null && (
              <p className="flex items-start gap-1.5 text-muted-foreground text-sm">
                <Flag
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-ceu"
                />
                <span>
                  Próximo nível:{" "}
                  <b className="font-semibold text-titulo">
                    {retomada.proximoNivel}
                  </b>
                </span>
              </p>
            )}
          </>
        )}
        {retomada.tipo === "comecar" && (
          <p>
            {onde} · Módulo {retomada.modulo.numero}. Primeira aula do curso.
          </p>
        )}
        {retomada.tipo === "questionario" && (
          <>
            <p>
              {onde} · Módulo {retomada.modulo.numero}. Você assistiu a todas as
              aulas;{" "}
              {faltam(
                retomada.questionarios.total - retomada.questionarios.feitas
              ).toLowerCase()}{" "}
              <b className="whitespace-nowrap font-semibold text-titulo">
                {plural(
                  retomada.questionarios.total - retomada.questionarios.feitas,
                  "questionário",
                  "questionários"
                )}
              </b>{" "}
              para o certificado.
            </p>
            <BarraProgresso
              className="h-2.5"
              pct={retomada.questionarios.pct}
              rotulo={`Questionários aprovados do curso ${retomada.curso.titulo}`}
            />
            <p className="text-muted-foreground text-sm tabular-nums">
              <b className="font-semibold text-titulo">
                {retomada.questionarios.pct}%
              </b>{" "}
              dos questionários, {retomada.questionarios.feitas} de{" "}
              {retomada.questionarios.total} aprovados
            </p>
          </>
        )}
        <Link className={cn(BOTAO_DO_BANNER, "mt-1")} href={acao.href}>
          {acao.icone === "questionario" ? (
            <ListChecks aria-hidden="true" />
          ) : (
            <Play aria-hidden="true" className="fill-current" />
          )}
          {acao.texto}
        </Link>
      </div>
      <Capa capa={retomada.curso.capa} />
    </section>
  );
}
