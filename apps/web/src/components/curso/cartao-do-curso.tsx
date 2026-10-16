import type { PaginaDoCurso } from "@cursos/api/dominio/pagina-do-curso";
import type { DiaISO } from "@cursos/api/dominio/tipos";
import { cn } from "@cursos/ui/lib/utils";
import {
  Award,
  Clock,
  Layers,
  type LucideIcon,
  Play,
  RotateCcw,
  Trophy,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { BOTAO, BOTAO_CONTORNO } from "@/components/casca/botoes";
import { BarraProgresso } from "@/components/meus-cursos/barra-progresso";
import { SeloEstado } from "@/components/meus-cursos/selo-estado";

import {
  aulasAssistidas,
  type CartaoDoCurso as Cartao,
  cartaoDoCurso,
  type IconeDoCartao,
} from "./textos";

const ICONE: Record<IconeDoCartao, LucideIcon> = {
  niveis: Layers,
  nivel: Award,
  relogio: Clock,
  trofeu: Trophy,
};

const ICONE_DO_BOTAO: Record<Cartao["botao"]["icone"], LucideIcon> = {
  play: Play,
  rever: RotateCcw,
};

export function CartaoDoCurso({
  className,
  hoje,
  pagina,
}: {
  className?: string;
  hoje: DiaISO;
  pagina: PaginaDoCurso;
}) {
  const { botao, inclui, situacao } = cartaoDoCurso(pagina, hoje);
  const IconeDoBotao = ICONE_DO_BOTAO[botao.icone];
  return (
    <aside
      aria-label="Seu progresso"
      className={cn(
        "@container overflow-hidden rounded-[20px] bg-card ring-1 ring-border",
        className
      )}
    >
      <div className="grid @lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="relative aspect-[900/604] @lg:self-start bg-sidebar">
          <Image
            alt={pagina.capa.alt}
            className="object-cover"
            fill
            priority
            sizes="(min-width: 1081px) 300px, (max-width: 767px) 100vw, 45vw"
            src={pagina.capa.url}
          />
        </div>
        <div className="grid content-start gap-3.5 p-5">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-2 tabular-nums">
            <SeloEstado estado={pagina.estado} />
            <span className="font-semibold text-foreground">
              {pagina.progresso.pct}%
            </span>
          </p>
          <BarraProgresso
            pct={pagina.progresso.pct}
            rotulo={`Progresso no curso ${pagina.titulo}`}
          />
          <p className="text-muted-foreground tabular-nums">
            {aulasAssistidas(pagina.progresso)}
          </p>
          <div className="-mx-5 my-0.5 h-px bg-border" />
          <div className="grid gap-0.5">
            <span className="text-[13px] text-muted-foreground">
              {situacao.rotulo}
            </span>
            <strong className="font-semibold text-base text-titulo leading-normal">
              {situacao.titulo}
            </strong>
          </div>
          <Link
            className={cn(
              botao.variante === "principal" ? BOTAO : BOTAO_CONTORNO,
              "w-full"
            )}
            href={botao.href}
          >
            <IconeDoBotao aria-hidden="true" className="size-[15px]" />
            {botao.texto}
          </Link>
          {inclui.length > 0 ? (
            <ul className="grid gap-2 text-[13px] text-muted-foreground">
              {inclui.map(({ icone, texto }) => {
                const Icone = ICONE[icone];
                return (
                  <li className="flex items-center gap-2" key={texto}>
                    <Icone
                      aria-hidden="true"
                      className="size-[15px] shrink-0"
                    />
                    {texto}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
