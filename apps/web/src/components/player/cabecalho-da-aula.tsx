import type { AulaNoPlayer } from "@cursos/api/dominio/aula";
import { cn } from "@cursos/ui/lib/utils";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";

import { BOTAO, BOTAO_CONTORNO } from "@/components/casca/botoes";
import { fmtMin } from "@/lib/formato";
import { caminhoDaAula } from "@/lib/rotas";

// O esqueleto de loading.tsx desenha as duas linhas com estas mesmas classes, então
// a altura dele bate com a do cabeçalho em toda largura.
export const TITULO_DA_AULA =
  "font-bold text-[clamp(22px,2.4vw,30px)] text-titulo leading-[1.2] tracking-tight";
export const LINHA_DO_MODULO = "mt-1 text-muted-foreground text-sm";

/**
 * O título da aula e a linha do módulo, acima do vídeo: a primeira coisa que a pessoa
 * lê na aula. A descrição fica abaixo da navegação, para o cabeçalho ter sempre a
 * altura do esqueleto e o vídeo não pular quando a aula chega.
 */
export function CabecalhoDaAula({ dados }: { dados: AulaNoPlayer }) {
  const { aula } = dados;
  return (
    <div className="min-w-0">
      <h1 className={TITULO_DA_AULA}>{aula.titulo}</h1>
      <p className={LINHA_DO_MODULO}>
        Módulo {aula.modulo.numero} · {aula.modulo.titulo} · aula{" "}
        {aula.numeroNoModulo} de {aula.totalNoModulo} ·{" "}
        {fmtMin(aula.duracaoSeg)}
      </p>
    </div>
  );
}

export function DescricaoDaAula({ dados }: { dados: AulaNoPlayer }) {
  const { descricao } = dados.aula;
  if (!descricao.trim()) {
    return null;
  }
  return (
    <section aria-labelledby="sobre-esta-aula" className="grid gap-2">
      <h2 className="font-semibold text-base text-titulo" id="sobre-esta-aula">
        Sobre esta aula
      </h2>
      <p className="max-w-[72ch] whitespace-pre-line text-pretty text-foreground text-sm">
        {descricao}
      </p>
    </section>
  );
}

/**
 * Anterior e Próxima aula, abaixo dos controles: a Próxima acende em Sol quando a aula
 * fica assistida, logo abaixo da linha de status que avisa a conquista. Anterior fica à
 * esquerda e Próxima à direita, também quando a outra não existe. Num curso de uma aula
 * só não há nada para navegar: sem a `nav`, o grid não ganha um vão vazio e o leitor de
 * tela não anuncia um landmark sem links. Os dois são os botões da casca: em contorno, a
 * borda em texto-apagado passa de 3:1 contra o fundo e clareia para titulo no foco.
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
          className={BOTAO_CONTORNO}
          href={caminhoDaAula(curso.slug, anterior.id)}
          title={anterior.titulo}
        >
          <ArrowLeft aria-hidden="true" />
          Anterior
        </Link>
      ) : null}
      {proxima ? (
        <Link
          className={cn(destacarProxima ? BOTAO : BOTAO_CONTORNO, "ml-auto")}
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
