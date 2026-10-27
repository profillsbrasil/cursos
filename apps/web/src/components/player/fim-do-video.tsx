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

/**
 * O cartão do app no lugar do vídeo que terminou, em vez da tela de outros vídeos do
 * YouTube. O iframe continua no player, escondido, e o cartão toma o lugar dele no
 * fluxo, sem ficar por cima.
 */
/** O fim da aula de amostra (a variante D do protótipo): o convite de troca no lugar da próxima aula. */
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
    <div className="grid min-h-full w-full place-items-center bg-sidebar p-6 text-center">
      <div className="grid max-w-[460px] justify-items-center gap-2.5">
        <h2 className="text-balance font-bold text-[22px] text-titulo tracking-[-0.01em]">
          {convite.titulo}
        </h2>
        <p className="text-pretty text-muted-foreground" id={idDaRazao}>
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
    <div className="grid min-h-full w-full place-items-center bg-sidebar p-6 text-center">
      <div className="grid max-w-[420px] justify-items-center gap-2.5">
        <span className="grid size-[52px] place-items-center rounded-full bg-ceu text-sobre-cor">
          <Check aria-hidden="true" className="size-[26px]" strokeWidth={2.5} />
        </span>
        <h2 className="mt-1 font-bold text-[22px] text-titulo tracking-[-0.01em]">
          {assistida ? "Aula assistida" : "Fim do vídeo"}
        </h2>
        {conquista ? (
          <span className="font-mono font-semibold text-base text-sol tabular-nums">
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
