import type {
  AlvoDoComunicado,
  ComunicadoDoAluno,
  ComunicadosDoAluno,
} from "@cursos/api/dominio/comunicado";
import { cn } from "@cursos/ui/lib/utils";
import { BookOpen, Megaphone } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { CabecalhoDaPagina } from "@/components/aluno/cabecalho-da-pagina";
import {
  BOTAO_CONTORNO,
  LINK_NO_TEXTO,
  PEQUENO,
} from "@/components/casca/botoes";
import { paragrafos } from "@/components/curso/textos";
import { Secao } from "@/components/meus-cursos/secao";
import { fmtData } from "@/lib/formato";

import {
  contagemDoMes,
  diaNaLinha,
  nomeDoMes,
  subtituloDaTela,
} from "./textos";

const LINHA_APAGADA =
  "flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground tabular-nums";
const LINK_DO_CURSO = cn(LINK_NO_TEXTO, "font-medium text-foreground");

function Megafone({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-full",
        className
      )}
    >
      <Megaphone className="size-5" />
    </span>
  );
}

function LinkDoCurso({
  alvo,
}: {
  alvo: Extract<AlvoDoComunicado, { tipo: "curso" }>;
}) {
  return (
    <Link className={LINK_DO_CURSO} href={alvo.href as Route}>
      {alvo.titulo}
    </Link>
  );
}

function Texto({ className, texto }: { className?: string; texto: string }) {
  return (
    <div className={cn("grid max-w-[64ch] gap-2 text-pretty", className)}>
      {paragrafos(texto).map((p) => (
        <p key={p}>{p}</p>
      ))}
    </div>
  );
}

function Destaque({ comunicado: c }: { comunicado: ComunicadoDoAluno }) {
  const doCurso = c.alvo.tipo === "curso" ? c.alvo : null;
  return (
    <article
      aria-labelledby="comunicado-destaque"
      className={cn(
        "grid overflow-hidden rounded-[20px] bg-card ring-1 ring-border",
        doCurso
          ? "@min-[641px]:grid-cols-[minmax(0,1fr)_minmax(0,40%)]"
          : "@min-[641px]:grid-cols-[minmax(0,1fr)_auto] gap-7 p-[clamp(22px,3.4vw,36px)]"
      )}
      data-destaque=""
    >
      <div className={doCurso ? "p-[clamp(22px,3.4vw,36px)]" : undefined}>
        <p className={LINHA_APAGADA}>
          <time dateTime={c.publicadoEm}>{fmtData(c.publicadoEm)}</time>
          {c.publicadoPor ? <span>por {c.publicadoPor}</span> : null}
        </p>
        <h2
          className="mt-2.5 text-balance font-bold text-2xl text-titulo leading-[1.3] tracking-tight"
          id="comunicado-destaque"
        >
          {c.titulo}
        </h2>
        <Texto className="mt-3 text-base leading-[1.55]" texto={c.texto} />
        {doCurso ? (
          <p className="mt-4 text-[13px] text-muted-foreground">
            Sobre o curso <LinkDoCurso alvo={doCurso} />
          </p>
        ) : null}
      </div>
      {doCurso ? (
        <span
          className="relative @min-[641px]:row-start-auto row-start-1 block @min-[641px]:aspect-auto aspect-[900/604] @min-[641px]:min-h-full bg-sidebar"
          data-capa=""
        >
          <Image
            alt=""
            className="object-cover"
            fill
            sizes="(max-width: 767px) 100vw, 40vw"
            src={doCurso.capa.url}
          />
        </span>
      ) : (
        <div className="@min-[641px]:row-start-auto row-start-1 grid content-start gap-2.5 text-[13px] text-muted-foreground">
          <Megafone className="bg-ceu text-sobre-cor" />
          <p>Para todos os alunos</p>
        </div>
      )}
    </article>
  );
}

function Linha({ comunicado: c }: { comunicado: ComunicadoDoAluno }) {
  const dia = diaNaLinha(c.dia);
  return (
    <li className="grid @min-[521px]:grid-cols-[64px_minmax(0,1fr)] grid-cols-[44px_minmax(0,1fr)] @min-[521px]:gap-5 gap-3.5 @min-[521px]:px-6 px-4 @min-[521px]:py-[22px] py-[18px]">
      <time
        className="grid content-start justify-items-center gap-0.5 pt-0.5"
        dateTime={c.dia}
      >
        <b className="font-bold @min-[521px]:text-[26px] text-[22px] text-titulo tabular-nums leading-none tracking-tight">
          {dia.numero}
        </b>
        <span className="text-muted-foreground text-xs">{dia.semana}</span>
      </time>
      <article className="grid min-w-0 gap-2">
        <h3 className="text-balance font-semibold text-base text-titulo leading-[1.4]">
          {c.titulo}
        </h3>
        <Texto className="text-sm" texto={c.texto} />
        <p className={LINHA_APAGADA}>
          <span>
            {c.alvo.tipo === "curso" ? (
              <LinkDoCurso alvo={c.alvo} />
            ) : (
              "Para todos"
            )}
          </span>
          {c.publicadoPor ? <span>por {c.publicadoPor}</span> : null}
        </p>
      </article>
    </li>
  );
}

function Vazio() {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4 rounded-[20px] bg-card p-6 ring-1 ring-border">
      <Megafone className="bg-popover text-ceu" />
      <div>
        <h2 className="font-semibold text-base text-titulo leading-[1.4]">
          Nenhum comunicado por enquanto
        </h2>
        <p className="mt-1 max-w-[56ch] text-pretty text-muted-foreground text-sm">
          Quando o admin publicar um aviso para todos ou sobre um dos seus
          cursos, ele aparece aqui, com o texto inteiro.
        </p>
        <Link
          className={cn(BOTAO_CONTORNO, PEQUENO, "mt-3.5")}
          href="/meus-cursos"
        >
          <BookOpen aria-hidden="true" />
          Ir para Meus cursos
        </Link>
      </div>
    </div>
  );
}

export function CabecalhoDosComunicados({
  subtitulo,
}: {
  subtitulo: string | null;
}) {
  return <CabecalhoDaPagina resumo={subtitulo} titulo="Comunicados" />;
}

export function TelaDeComunicados({
  comunicados,
}: {
  comunicados: ComunicadosDoAluno;
}) {
  return (
    <>
      <CabecalhoDosComunicados subtitulo={subtituloDaTela(comunicados)} />
      <div className="@container">
        {comunicados.tipo === "vazio" ? (
          <Vazio />
        ) : (
          <div className="grid gap-10">
            <Destaque comunicado={comunicados.destaque} />
            {comunicados.anteriores.length > 0 ? (
              <div className="grid gap-9">
                {comunicados.anteriores.map((m) => (
                  <Secao
                    id={`comunicados-${m.mes}`}
                    key={m.mes}
                    subtitulo={contagemDoMes(m)}
                    titulo={nomeDoMes(m.mes)}
                  >
                    <ol className="divide-y divide-border rounded-[20px] bg-card ring-1 ring-border">
                      {m.comunicados.map((c) => (
                        <Linha comunicado={c} key={c.id} />
                      ))}
                    </ol>
                  </Secao>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </>
  );
}
