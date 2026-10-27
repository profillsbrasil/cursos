import type { PaginaDoCurso } from "@cursos/api/dominio/pagina-do-curso";
import { cn } from "@cursos/ui/lib/utils";
import { Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { BOTAO_CONTORNO } from "@/components/casca/botoes";
import { CARTAO } from "@/components/casca/cartoes";
import { fmtPts } from "@/lib/formato";
import { caminhoDaAula } from "@/lib/rotas";

import { BotaoDeTroca } from "./botao-de-troca";
import { trocaDaAmostra } from "./textos-da-amostra";

/**
 * A coluna da página do curso na amostra (a variante A do protótipo), no lugar
 * do cartão "Seu progresso": a capa, o preço do curso inteiro, o saldo antes e
 * depois da troca, o Trocar e o Assistir à amostra.
 */
export function TrocaDaAmostra({
  amostra,
  className,
  pagina,
}: {
  amostra: NonNullable<PaginaDoCurso["amostra"]>;
  className?: string;
  pagina: Pick<PaginaDoCurso, "capa" | "slug">;
}) {
  const troca = trocaDaAmostra(amostra);
  const idDaRazao = `saldo-da-troca-${amostra.cursoId}`;
  return (
    <aside
      aria-label="Trocar o curso"
      className={cn(CARTAO, "@container overflow-hidden", className)}
    >
      <div className="grid @lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="relative aspect-[900/604] @lg:self-start bg-sidebar">
          <Image
            alt={pagina.capa.alt}
            className="object-cover"
            fill
            preload
            sizes="(min-width: 1081px) 300px, (max-width: 767px) 100vw, 45vw"
            src={pagina.capa.url}
          />
        </div>
        <div className="grid content-start gap-3.5 p-5">
          {troca.tipo === "sem_preco" ? (
            <p className="text-muted-foreground">{troca.frase}</p>
          ) : (
            <>
              <p className="grid gap-1">
                <span className="text-[13px] text-muted-foreground">
                  Troque o curso inteiro por
                </span>
                <span className="font-bold text-[26px] text-sol leading-[1.15] tracking-tight">
                  {fmtPts(troca.preco)}
                </span>
              </p>
              <p
                className="text-[13px] text-muted-foreground tabular-nums"
                id={idDaRazao}
              >
                {troca.saldo}
              </p>
              <BotaoDeTroca
                className="w-full"
                cursoId={amostra.cursoId}
                idDaRazao={idDaRazao}
                troca={troca}
              />
            </>
          )}
          <Link
            className={cn(BOTAO_CONTORNO, "w-full")}
            href={caminhoDaAula(pagina.slug, amostra.aulaId)}
          >
            <Play aria-hidden="true" className="fill-current" />
            Assistir à amostra
          </Link>
        </div>
      </div>
    </aside>
  );
}
