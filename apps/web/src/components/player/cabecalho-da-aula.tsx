import type { AulaNoPlayer } from "@cursos/api/dominio/aula";
import { buttonVariants } from "@cursos/ui/components/button";
import { cn } from "@cursos/ui/lib/utils";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";

import { fmtMin } from "@/lib/formato";
import { caminhoDaAula } from "@/lib/rotas";

const BOTAO =
  "h-11 gap-2 rounded-full border-[1.5px] px-[18px] font-semibold text-sm";
const SECUNDARIO =
  "border-chart-5 bg-transparent text-foreground hover:border-foreground hover:bg-transparent dark:border-chart-5 dark:bg-transparent dark:hover:border-foreground dark:hover:bg-transparent";
// O html tem .dark fixo: sem os dark: o outline mantém dark:bg-input/30 por especificidade.
// Sob o cursor e com o foco de teclado, clareia e brilha como o botão amarelo da casca;
// o texto fica sobre-cor, contra o hover:text-foreground da variante outline.
const DESTAQUE =
  "border-sol bg-sol text-sobre-cor hover:border-sol-hover hover:bg-sol-hover hover:text-sobre-cor hover:shadow-brilho dark:border-sol dark:bg-sol dark:hover:border-sol-hover dark:hover:bg-sol-hover";

/** O título da aula e a linha do módulo, acima do vídeo: a primeira coisa que a pessoa lê na aula. */
export function CabecalhoDaAula({ dados }: { dados: AulaNoPlayer }) {
  const { aula } = dados;
  return (
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
  );
}

/**
 * Anterior e Próxima aula, abaixo dos controles: a Próxima acende em Sol quando a aula
 * fica assistida, logo abaixo da linha de status que avisa a conquista. Anterior fica à
 * esquerda e Próxima à direita, também quando a outra não existe. Num curso de uma aula
 * só não há nada para navegar: sem a `nav`, o grid não ganha um vão vazio e o leitor de
 * tela não anuncia um landmark sem links.
 */
export function NavegacaoEntreAulas({
  dados,
  destacarProxima,
}: {
  dados: AulaNoPlayer;
  destacarProxima: boolean;
}) {
  const { anterior, curso, proxima } = dados;
  if (!(anterior || proxima)) {
    return null;
  }
  return (
    <nav
      aria-label="Navegação entre aulas"
      className="flex flex-wrap justify-between gap-2"
    >
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
            "ml-auto",
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
  );
}
