"use client";

import type {
  AcessoDoAluno as Acesso,
  CursoParaLiberar,
  LiberacaoNaTela,
} from "@cursos/api/dominio/liberacao";
import type { CursoId } from "@cursos/api/dominio/tipos";
import { Button } from "@cursos/ui/components/button";
import { cn } from "@cursos/ui/lib/utils";
import { Check, ChevronRight, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";

import { BOTAO_CONTORNO, PEQUENO } from "@/components/casca/botoes";
import { SELO } from "@/components/casca/selos";
import { plural } from "@/lib/formato";
import { rota } from "@/lib/rotas";
import { useAcao } from "@/lib/use-acao";
import { trpcClient } from "@/utils/trpc";

import {
  BarraDeAulas,
  dataDaLiberacao,
  fraseDoCurso,
  SeloDeSituacao,
  seloDoCurso,
} from "./acompanhamento";
import {
  Carregando,
  ConfirmacaoNaLinha,
  type LinhaAberta,
} from "./confirmacao-na-linha";
import { FotoDaPessoa } from "./foto-da-pessoa";
import { Secao, Vazio } from "./partes";
import { SOBRE_O_PERFIL } from "./pessoas/perfis";
import { VoltaParaALista } from "./volta-para-a-lista";

const AVISO =
  "flex gap-2.5 rounded-[14px] bg-sol/10 text-foreground text-sm ring-1 ring-sol/40";

interface Para {
  nome: string;
  userId: string;
}

const focarLiberacoesSeOFocoCaiuNoBody = () => {
  if (document.activeElement === document.body) {
    document.getElementById("liberacoes")?.focus();
  }
};

function AcaoDaLiberacao({
  l,
  linhaAberta,
}: {
  l: LiberacaoNaTela;
  linhaAberta: LinhaAberta;
}) {
  const { executar, pendente } = useAcao();
  const { titulo } = l.curso;
  const { fechar } = linhaAberta;

  const revogar = useCallback(
    () =>
      executar(
        () => trpcClient.admin.liberacoes.revogar.mutate({ liberacaoId: l.id }),
        {
          depois: () => {
            fechar(`revogar:${l.id}`);
            focarLiberacoesSeOFocoCaiuNoBody();
          },
          sucesso: (r) =>
            r.revogada
              ? `Acesso a ${titulo} revogado.`
              : `O acesso a ${titulo} já estava revogado.`,
        }
      ),
    [executar, fechar, l.id, titulo]
  );

  const { acao } = l;

  switch (acao.tipo) {
    case "fixa_por_troca":
      return (
        <span className="text-muted-foreground text-sm">
          Troca, não se revoga
        </span>
      );
    case "pelo_perfil":
      return (
        <Link
          className="toque text-ceu hover:text-titulo text-[13px] font-semibold transition-colors"
          href="/admin/liberacoes/perfis"
        >
          Pelo perfil {SOBRE_O_PERFIL[acao.perfil].nome}
        </Link>
      );
    case "revogada":
      return null;
    case "revogar":
      return (
        <ConfirmacaoNaLinha
          botao={{ nome: `Confirmar: revogar ${titulo}`, rotulo: "Revogar" }}
          chave={`revogar:${l.id}`}
          className="flex flex-wrap items-center gap-2 @xl:justify-end"
          confirmar={revogar}
          enviando={pendente}
          gatilho={{ nome: `Revogar ${titulo}`, rotulo: "Revogar" }}
          linhaAberta={linhaAberta}
          pergunta={<span className="text-foreground">Tirar o acesso?</span>}
        />
      );
    default:
      return acao satisfies never;
  }
}

function Rodape({ hoje, l }: { hoje: string; l: LiberacaoNaTela }) {
  return (
    <p className="text-muted-foreground mt-1.5 text-xs tabular-nums">
      {dataDaLiberacao(l, hoje)}
    </p>
  );
}

function ItemDaLiberacao({
  hoje,
  l,
  linhaAberta,
}: {
  hoje: string;
  l: LiberacaoNaTela;
  linhaAberta: LinhaAberta;
}) {
  const a = l.acompanhamento;
  const revogada = l.acao.tipo === "revogada";
  const frase = fraseDoCurso(a, hoje);

  return (
    <li className="grid gap-x-4 gap-y-3 px-4 py-4 @xl:grid-cols-[minmax(0,1fr)_auto] @xl:px-5">
      <div className="grid min-w-0 content-start gap-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <h3
            className={cn(
              "text-base font-semibold",
              revogada ? "text-muted-foreground" : "text-titulo"
            )}
          >
            {l.curso.titulo}
          </h3>
          {revogada ? null : (
            <SeloDeSituacao selo={seloDoCurso(a.situacao.tipo)} />
          )}
        </div>
        {revogada || frase === null ? null : (
          <p className="text-foreground text-sm">
            {frase.texto}
            {frase.quando ? (
              <span className="text-muted-foreground"> · {frase.quando}</span>
            ) : null}
          </p>
        )}
        <BarraDeAulas
          className="mt-1.5 max-w-[32.5rem]"
          progresso={a.progresso}
        />
        <Rodape hoje={hoje} l={l} />
      </div>
      {revogada ? null : (
        <div className="@xl:justify-self-end">
          <AcaoDaLiberacao l={l} linhaAberta={linhaAberta} />
        </div>
      )}
    </li>
  );
}

function Liberacoes({
  hoje,
  liberacoes,
  linhaAberta,
}: {
  hoje: string;
  liberacoes: readonly LiberacaoNaTela[];
  linhaAberta: LinhaAberta;
}) {
  if (liberacoes.length === 0) {
    return <Vazio>Nenhuma liberação ainda. Libere um curso abaixo.</Vazio>;
  }

  const ativas = liberacoes.filter((l) => l.acao.tipo !== "revogada");
  const revogadas = liberacoes.filter((l) => l.acao.tipo === "revogada");

  const item = (l: LiberacaoNaTela) => (
    <ItemDaLiberacao hoje={hoje} key={l.id} l={l} linhaAberta={linhaAberta} />
  );

  return (
    <div className="@container">
      {ativas.length === 0 ? (
        <Vazio>Nenhuma liberação ativa.</Vazio>
      ) : (
        <ul className="divide-border divide-y">{ativas.map(item)}</ul>
      )}
      {revogadas.length === 0 ? null : (
        <details className="group/revogadas border-border border-t">
          <summary className="text-muted-foreground hover:text-titulo flex cursor-pointer list-none items-center gap-2 px-4 py-3.5 text-sm font-medium transition-colors hover:bg-white/8 @xl:px-5 [&::-webkit-details-marker]:hidden">
            <ChevronRight
              aria-hidden="true"
              className="size-4 transition-transform duration-200 group-open/revogadas:rotate-90 motion-reduce:transition-none"
            />
            {plural(revogadas.length, "revogada", "revogadas")}
          </summary>
          <ul className="divide-border border-border divide-y border-t">
            {revogadas.map(item)}
          </ul>
        </details>
      )}
    </div>
  );
}

function useLiberar({ nome, userId }: Para, cursoId: CursoId, titulo: string) {
  const { executar, pendente } = useAcao();
  const focarSelo = useRef(false);

  const liberar = useCallback(
    () =>
      executar(
        () => trpcClient.admin.liberacoes.liberar.mutate({ cursoId, userId }),
        {
          depois: () => {
            focarSelo.current = true;
          },
          sucesso: (r) =>
            r.nova
              ? `Acesso a ${titulo} liberado para ${nome}.`
              : `O acesso a ${titulo} já estava liberado para ${nome}.`,
        }
      ),
    [executar, cursoId, userId, nome, titulo]
  );

  const selo = useCallback((el: HTMLSpanElement | null) => {
    if (el && focarSelo.current) {
      focarSelo.current = false;
      el.focus({ preventScroll: true });
    }
  }, []);

  return { enviando: pendente, liberar, selo };
}

function Liberado({ selo }: { selo: (el: HTMLSpanElement | null) => void }) {
  return (
    <span className={cn(SELO, "bg-ceu/14 text-ceu")} ref={selo} tabIndex={-1}>
      <Check aria-hidden="true" strokeWidth={2.4} />
      Liberado
    </span>
  );
}

function BotaoLiberar({
  enviando,
  liberar,
  titulo,
}: {
  enviando: boolean;
  liberar: () => void;
  titulo: string;
}) {
  return (
    <Button
      aria-busy={enviando}
      aria-label={`Liberar ${titulo}`}
      className={cn(BOTAO_CONTORNO, PEQUENO)}
      disabled={enviando}
      focusableWhenDisabled
      onClick={liberar}
    >
      <Carregando ativo={enviando} />
      Liberar
    </Button>
  );
}

function LinhaDoCurso({ c, para }: { c: CursoParaLiberar; para: Para }) {
  const { id, titulo } = c.curso;
  const { enviando, liberar, selo } = useLiberar(para, id, titulo);

  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-5 py-3.5 @lg:grid @lg:grid-cols-[minmax(0,1fr)_auto]">
      <span className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <span className="text-foreground font-medium">{titulo}</span>
        {c.emProducao ? (
          <SeloDeSituacao selo={seloDoCurso("em_producao")} />
        ) : null}
      </span>
      {c.liberado ? (
        <Liberado selo={selo} />
      ) : (
        <BotaoLiberar enviando={enviando} liberar={liberar} titulo={titulo} />
      )}
    </li>
  );
}

export function AcessoDoAluno({ acesso }: { acesso: Acesso }) {
  const [chave, pedir] = useState<string | null>(null);

  const fechar = useCallback(
    (minha: string) => pedir((atual) => (atual === minha ? null : atual)),
    []
  );

  const linhaAberta: LinhaAberta = { chave, fechar, pedir };
  const { pessoa, userId } = acesso;
  const nome = pessoa?.nome ?? userId;
  const para: Para = { nome, userId };

  const ativas = acesso.liberacoes.filter(
    (l) => l.acao.tipo !== "revogada"
  ).length;

  return (
    <>
      <VoltaParaALista href="/admin/liberacoes" nome="Liberações" />
      <header className="mb-7 flex items-center gap-4">
        <FotoDaPessoa foto={pessoa?.foto ?? null} nome={nome} size="lg" />
        <div className="grid min-w-0 gap-1">
          <h1 className="text-titulo text-3xl font-bold tracking-tight text-balance [overflow-wrap:anywhere]">
            {nome}
          </h1>
          <p className="text-muted-foreground truncate">
            {pessoa?.email ?? userId}
          </p>
          {pessoa ? (
            <Link
              className="text-ceu hover:text-titulo justify-self-start text-[13px] font-semibold transition-colors"
              href={rota(`/admin/pessoas/${userId}`)}
            >
              Perfil e papel
            </Link>
          ) : null}
        </div>
      </header>
      {pessoa ? null : (
        <p className={cn(AVISO, "mb-9 px-4 py-3.5")}>
          <TriangleAlert
            aria-hidden="true"
            className="text-sol mt-0.5 size-4 shrink-0"
          />
          Esta pessoa não existe mais no login da plataforma. Dá para revogar o
          que ela tinha, mas não para liberar nada novo.
        </p>
      )}
      <div className="grid gap-10">
        <Secao
          id="liberacoes"
          resumo={`${plural(ativas, "ativa", "ativas")}, ${plural(acesso.liberacoes.length - ativas, "revogada", "revogadas")}`}
          titulo="Liberações"
        >
          <Liberacoes
            hoje={acesso.hoje}
            liberacoes={acesso.liberacoes}
            linhaAberta={linhaAberta}
          />
        </Secao>
        {pessoa ? (
          <Secao
            id="liberar-curso"
            resumo={plural(acesso.cursos.length, "curso", "cursos")}
            titulo="Liberar curso"
          >
            {acesso.cursos.length === 0 ? (
              <Vazio>Nenhum curso no catálogo.</Vazio>
            ) : (
              <ul className="divide-border @container divide-y">
                {acesso.cursos.map((c) => (
                  <LinhaDoCurso c={c} key={c.curso.id} para={para} />
                ))}
              </ul>
            )}
          </Secao>
        ) : null}
      </div>
    </>
  );
}
