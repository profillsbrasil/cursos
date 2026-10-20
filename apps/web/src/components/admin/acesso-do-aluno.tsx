"use client";

import type {
  AcessoDoAluno as Acesso,
  CursoParaLiberar,
  LiberacaoNaTela,
} from "@cursos/api/dominio/liberacao";
import type { CursoId } from "@cursos/api/dominio/tipos";
import { Button } from "@cursos/ui/components/button";
import { cn } from "@cursos/ui/lib/utils";
import { ArrowLeft, Check, ChevronRight, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";

import { BOTAO_CONTORNO, PEQUENO } from "@/components/casca/botoes";
import { SELO } from "@/components/casca/selos";
import { plural } from "@/lib/formato";
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

const AVISO =
  "flex gap-2.5 rounded-[14px] bg-sol/10 text-foreground text-sm ring-1 ring-sol/40";

interface Para {
  nome: string;
  userId: string;
}

// Só quando o foco caiu no body: se o admin já está em outra linha, não o tira de lá.
const focarLiberacoes = () => {
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
          // O botão some e a linha desce para as revogadas: o foco vai para o título da tabela.
          depois: () => {
            fechar(`revogar:${l.id}`);
            focarLiberacoes();
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
          className="toque font-semibold text-[13px] text-ceu transition-colors hover:text-titulo"
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
          className="flex flex-wrap items-center @xl:justify-end gap-2"
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
    <p className="mt-1.5 text-muted-foreground text-xs tabular-nums">
      {dataDaLiberacao(l, hoje)}
    </p>
  );
}

/**
 * Uma liberação: título e selo; a frase do estudo; a barra; a data. Revogar fica
 * à direita e, em container estreito, desce para o pé.
 */
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
    <li className="grid @xl:grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-3 @xl:px-5 px-4 py-4">
      <div className="grid min-w-0 content-start gap-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <h3
            className={cn(
              "font-semibold text-base",
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
        <ul className="divide-y divide-border">{ativas.map(item)}</ul>
      )}
      {revogadas.length === 0 ? null : (
        // As revogadas ficam recolhidas no fim. Sob o cursor e com o foco, o
        // summary ganha o fundo branco a 8% e o texto em titulo, como o módulo do player.
        <details className="group/revogadas border-border border-t">
          <summary className="flex cursor-pointer list-none items-center gap-2 @xl:px-5 px-4 py-3.5 font-medium text-muted-foreground text-sm transition-colors hover:bg-white/8 hover:text-titulo [&::-webkit-details-marker]:hidden">
            <ChevronRight
              aria-hidden="true"
              className="size-4 transition-transform duration-200 group-open/revogadas:rotate-90 motion-reduce:transition-none"
            />
            {plural(revogadas.length, "revogada", "revogadas")}
          </summary>
          <ul className="divide-y divide-border border-border border-t">
            {revogadas.map(item)}
          </ul>
        </details>
      )}
    </div>
  );
}

/**
 * Liberar a partir de uma linha. Depois do sucesso a linha fica no lugar e o
 * botão vira o selo "Liberado", que recebe o foco sem rolar a página.
 */
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
  // Em lista de 32rem ou mais, o botão fica na coluna da direita mesmo quando o
  // selo quebra linha. Mais estreita, a linha quebra como texto: um selo longo
  // não cabe ao lado do botão.
  return (
    <li className="flex @lg:grid @lg:grid-cols-[minmax(0,1fr)_auto] flex-wrap items-center justify-between gap-x-4 gap-y-3 px-5 py-3.5">
      <span className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <span className="font-medium text-foreground">{titulo}</span>
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
      <Link
        className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-full pr-2 font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
        href="/admin/liberacoes"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Liberações
      </Link>
      <header className="mb-9 flex items-center gap-4">
        <FotoDaPessoa foto={pessoa?.foto ?? null} nome={nome} size="lg" />
        <div className="grid min-w-0 gap-1">
          <h1 className="truncate font-bold text-3xl text-titulo tracking-tight">
            {nome}
          </h1>
          <p className="truncate text-muted-foreground">
            {pessoa?.email ?? userId}
          </p>
        </div>
      </header>
      {pessoa ? null : (
        <p className={cn(AVISO, "mb-9 max-w-[70ch] px-4 py-3.5")}>
          <TriangleAlert
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-sol"
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
              <ul className="@container divide-y divide-border">
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
