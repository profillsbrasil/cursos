import type { AulaNoPlayer } from "@cursos/api/dominio/aula";
import type { Conquista } from "@cursos/api/dominio/registro";
import { ArrowRight, Check, RotateCcw } from "lucide-react";
import Link from "next/link";

import { BOTAO, BOTAO_CONTORNO } from "@/components/casca/botoes";
import { BotaoDeTroca } from "@/components/curso/botao-de-troca";
import {
  conviteDaAmostra,
  trocaDaAmostra,
} from "@/components/curso/textos-da-amostra";
import { fmtMin } from "@/lib/formato";
import { caminhoDaAula, caminhoDoCurso } from "@/lib/rotas";

function FimDaAmostra({
  amostra,
  slug,
}: {
  amostra: NonNullable<AulaNoPlayer["amostra"]>;
  slug: string;
}) {
  const convite = conviteDaAmostra(amostra);
  const troca = trocaDaAmostra(amostra);
  const idDaRazao = `convite-da-troca-${amostra.cursoId}`;

  return (
    <div className="bg-sidebar grid min-h-full w-full place-items-center p-6 text-center">
      <div className="grid max-w-[460px] justify-items-center gap-2.5">
        <h2 className="text-titulo text-[22px] font-bold tracking-[-0.01em] text-balance">
          {convite.titulo}
        </h2>
        <p className="text-muted-foreground text-pretty" id={idDaRazao}>
          {convite.detalhe}
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {troca.tipo === "sem_preco" ? null : (
            <BotaoDeTroca
              cursoId={amostra.cursoId}
              idDaRazao={idDaRazao}
              troca={troca}
            />
          )}
          <Link className={BOTAO_CONTORNO} href={caminhoDoCurso(slug)}>
            Ver o curso
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * O cartão do app no lugar do vídeo que terminou, em vez da tela de outros vídeos do
 * YouTube. O iframe continua no player, escondido, e o cartão toma o lugar dele no
 * fluxo, sem ficar por cima.
 */
export function FimDoVideo({
  aoRever,
  assistida,
  conquista,
  dados,
}: {
  aoRever: () => void;
  assistida: boolean;
  conquista: Conquista | null;
  dados: AulaNoPlayer;
}) {
  const { amostra, curso, proxima } = dados;

  if (amostra) {
    return <FimDaAmostra amostra={amostra} slug={curso.slug} />;
  }

  const duracaoDaProxima = proxima
    ? dados.modulos.flatMap((m) => m.aulas).find((a) => a.id === proxima.id)
        ?.duracaoSeg
    : undefined;

  return (
    <div className="bg-sidebar grid min-h-full w-full place-items-center p-6 text-center">
      <div className="grid max-w-[420px] justify-items-center gap-2.5">
        <span className="bg-ceu text-sobre-cor grid size-[52px] place-items-center rounded-full">
          <Check aria-hidden="true" className="size-[26px]" strokeWidth={2.5} />
        </span>
        <h2 className="text-titulo mt-1 text-[22px] font-bold tracking-[-0.01em]">
          {assistida ? "Aula assistida" : "Fim do vídeo"}
        </h2>
        {conquista ? (
          <span className="text-sol font-mono text-base font-semibold tabular-nums">
            +{conquista.pontos} pts
          </span>
        ) : null}
        {proxima ? (
          <p className="text-muted-foreground">
            A seguir: {proxima.titulo}
            {duracaoDaProxima === undefined
              ? null
              : ` · ${fmtMin(duracaoDaProxima)}`}
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {proxima ? (
            <Link
              className={BOTAO}
              href={caminhoDaAula(curso.slug, proxima.id)}
            >
              Próxima aula
              <ArrowRight aria-hidden="true" />
            </Link>
          ) : (
            <Link className={BOTAO} href={caminhoDoCurso(curso.slug)}>
              Ver o curso
              <ArrowRight aria-hidden="true" />
            </Link>
          )}
          <button className={BOTAO_CONTORNO} onClick={aoRever} type="button">
            <RotateCcw aria-hidden="true" />
            Rever do início
          </button>
        </div>
      </div>
    </div>
  );
}
