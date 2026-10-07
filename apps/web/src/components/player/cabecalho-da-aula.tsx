import type { AulaNoPlayer } from "@cursos/api/dominio/aula";
import { buttonVariants } from "@cursos/ui/components/button";
import { cn } from "@cursos/ui/lib/utils";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";

import { fmtMin } from "@/lib/formato";
import { caminhoDaAula } from "@/lib/rotas";

const BOTAO =
  "h-11 gap-2 rounded-full border-[1.5px] px-[18px] font-semibold text-sm focus-visible:outline-2 focus-visible:outline-ceu focus-visible:outline-solid focus-visible:outline-offset-2";
const SECUNDARIO =
  "border-chart-5 bg-transparent text-foreground hover:border-foreground hover:bg-transparent dark:bg-transparent dark:hover:bg-transparent";
// O html tem .dark fixo: sem os dark: o outline mantém dark:bg-input/30 por especificidade.
const DESTAQUE =
  "border-sol bg-sol text-sobre-cor hover:bg-sol/90 dark:border-sol dark:bg-sol dark:hover:bg-sol/90";

export function CabecalhoDaAula({
  dados,
  destacarProxima,
}: {
  dados: AulaNoPlayer;
  destacarProxima: boolean;
}) {
  const { anterior, aula, curso, proxima } = dados;
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3.5">
      <div className="min-w-0">
        <h1 className="font-bold text-[clamp(22px,2.4vw,30px)] text-titulo leading-tight tracking-[-0.02em]">
          {aula.titulo}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Módulo {aula.modulo.numero} · {aula.modulo.titulo} · aula{" "}
          {aula.numeroNoModulo} de {aula.totalNoModulo} ·{" "}
          {fmtMin(aula.duracaoSeg)}
        </p>
      </div>
      <nav aria-label="Navegação entre aulas" className="flex flex-wrap gap-2">
        {anterior ? (
          <Link
            className={cn(
              buttonVariants({ variant: "outline" }),
              BOTAO,
              SECUNDARIO
            )}
            href={caminhoDaAula(curso.slug, anterior.id)}
            title={anterior.titulo}
          >
            <ArrowLeft aria-hidden="true" />
            Anterior
          </Link>
        ) : null}
        {proxima ? (
          <Link
            className={cn(
              buttonVariants({ variant: "outline" }),
              BOTAO,
              destacarProxima ? DESTAQUE : SECUNDARIO
            )}
            href={caminhoDaAula(curso.slug, proxima.id)}
            title={proxima.titulo}
          >
            Próxima aula
            <ArrowRight aria-hidden="true" />
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
