"use client";

import type {
  AcessoDoAluno as Acesso,
  CursoParaLiberar,
  LiberacaoNaTela,
  TrilhaParaLiberar,
} from "@cursos/api/dominio/liberacao";
import { Button } from "@cursos/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@cursos/ui/components/table";
import { cn } from "@cursos/ui/lib/utils";
import { ArrowLeft, Check, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useCallback, useRef, useState } from "react";

import { BOTAO_CONTORNO } from "@/components/casca/botoes";
import { fmtData, plural } from "@/lib/formato";
import { useAcao } from "@/lib/use-acao";
import { trpcClient } from "@/utils/trpc";

import {
  Carregando,
  ConfirmacaoNaLinha,
  type LinhaAberta,
  PEQUENO,
} from "./confirmacao-na-linha";
import { FotoDaPessoa } from "./foto-da-pessoa";
import { CABECA, CELULA, SELO, Secao, Vazio } from "./partes";

const TIPO = { curso: "Curso", trilha: "Trilha" } as const;
const CONTORNO_NEUTRO =
  "bg-transparent text-muted-foreground ring-1 ring-muted-foreground ring-inset";
const ORIGEM = {
  admin: { classe: CONTORNO_NEUTRO, rotulo: "Admin" },
  troca: { classe: "bg-sol/14 text-sol", rotulo: "Troca" },
} as const;
const AVISO =
  "flex gap-2.5 rounded-[14px] bg-sol/10 text-foreground text-sm ring-1 ring-sol/40";

interface Para {
  nome: string;
  userId: string;
}

type Pedido = Parameters<
  typeof trpcClient.admin.alunos.liberar.mutate
>[0]["alvo"];

/** "A", "A e B", "A, B e C". */
const lista = (itens: readonly string[]) =>
  new Intl.ListFormat("pt-BR", { type: "conjunction" }).format(itens);

const focarLiberacoes = () => document.getElementById("liberacoes")?.focus();

function AcaoDaLiberacao({
  l,
  linhaAberta,
}: {
  l: LiberacaoNaTela;
  linhaAberta: LinhaAberta;
}) {
  const { executar, pendente } = useAcao();
  const { titulo } = l.alvo;
  const { pedir } = linhaAberta;
  const revogar = useCallback(
    () =>
      executar(
        () => trpcClient.admin.alunos.revogar.mutate({ liberacaoId: l.id }),
        {
          // O botão some e a linha desce para as revogadas: o foco vai para o título da tabela.
          depois: () => {
            pedir(null);
            focarLiberacoes();
          },
          sucesso: (r) =>
            r.revogada
              ? `Acesso a ${titulo} revogado.`
              : `O acesso a ${titulo} já estava revogado.`,
        }
      ),
    [executar, pedir, l.id, titulo]
  );
  const { acao } = l;
  switch (acao.tipo) {
    case "fixa_por_troca":
      return <span>Troca, não se revoga</span>;
    case "revogada":
      return (
        <span className="tabular-nums">Revogada em {fmtData(acao.em)}</span>
      );
    case "revogar":
      return (
        <ConfirmacaoNaLinha
          botao={{ nome: `Confirmar: revogar ${titulo}`, rotulo: "Revogar" }}
          chave={`revogar:${l.id}`}
          className="flex flex-wrap items-center justify-end gap-2"
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

function Liberacoes({
  liberacoes,
  linhaAberta,
}: {
  liberacoes: readonly LiberacaoNaTela[];
  linhaAberta: LinhaAberta;
}) {
  if (liberacoes.length === 0) {
    return (
      <Vazio>
        Nenhuma liberação ainda. Libere uma trilha ou um curso abaixo.
      </Vazio>
    );
  }
  return (
    <Table className="min-w-[640px]">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className={CABECA}>Acesso</TableHead>
          <TableHead className={CABECA}>Origem</TableHead>
          <TableHead className={CABECA}>Liberada em</TableHead>
          <TableHead className={cn(CABECA, "text-right")}>
            <span className="sr-only">Ação</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {liberacoes.map((l) => {
          const revogada = l.acao.tipo === "revogada";
          return (
            <TableRow className="text-muted-foreground" key={l.id}>
              <TableCell className={CELULA}>
                <span
                  className={cn(
                    "block font-medium",
                    !revogada && "text-foreground"
                  )}
                >
                  {l.alvo.titulo}
                </span>
                <span className="text-xs">{TIPO[l.alvo.tipo]}</span>
              </TableCell>
              <TableCell className={CELULA}>
                <span className={cn(SELO, ORIGEM[l.origem].classe)}>
                  {ORIGEM[l.origem].rotulo}
                </span>
              </TableCell>
              <TableCell
                className={cn(
                  CELULA,
                  "tabular-nums",
                  !revogada && "text-foreground"
                )}
              >
                {fmtData(l.liberadaEm)}
              </TableCell>
              <TableCell className={cn(CELULA, "text-right")}>
                <AcaoDaLiberacao l={l} linhaAberta={linhaAberta} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

/**
 * Liberar a partir de uma linha. Depois do sucesso a linha fica no lugar e o
 * botão vira o selo "Liberado", que recebe o foco sem rolar a página.
 */
function useLiberar(
  { nome, userId }: Para,
  pedido: Pedido,
  titulo: string,
  depois?: () => void
) {
  const { executar, pendente } = useAcao();
  const focarSelo = useRef(false);
  const liberar = useCallback(
    () =>
      executar(
        () => trpcClient.admin.alunos.liberar.mutate({ alvo: pedido, userId }),
        {
          depois: () => {
            focarSelo.current = true;
            depois?.();
          },
          sucesso: (r) =>
            r.nova
              ? `Acesso a ${titulo} liberado para ${nome}.`
              : `O acesso a ${titulo} já estava liberado para ${nome}.`,
        }
      ),
    [executar, pedido, userId, nome, titulo, depois]
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
    <span
      className={cn(SELO, "gap-1 bg-ceu/14 text-ceu focus:outline-none")}
      ref={selo}
      tabIndex={-1}
    >
      <Check aria-hidden="true" className="size-3.5" strokeWidth={2.4} />
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
      className={cn(BOTAO_CONTORNO, PEQUENO, "disabled:opacity-100")}
      disabled={enviando}
      focusableWhenDisabled
      onClick={liberar}
    >
      <Carregando ativo={enviando} />
      Liberar
    </Button>
  );
}

function LinhaParaLiberar({
  acao,
  selos,
  titulo,
}: {
  acao: ReactNode;
  selos?: ReactNode;
  titulo: string;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-5 py-3.5">
      <span className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <span className="font-medium text-foreground">{titulo}</span>
        {selos}
      </span>
      {acao}
    </li>
  );
}

function LinhaDaTrilha({
  linhaAberta,
  para,
  t,
}: {
  linhaAberta: LinhaAberta;
  para: Para;
  t: TrilhaParaLiberar;
}) {
  const { id, titulo } = t.alvo;
  const trocados = t.trocadosNaTrilha;
  const { pedir } = linhaAberta;
  const fechar = useCallback(() => pedir(null), [pedir]);
  const { enviando, liberar, selo } = useLiberar(
    para,
    { id, tipo: "trilha", trocadosVistos: trocados.map((c) => c.id) },
    titulo,
    fechar
  );
  let acao: ReactNode;
  if (t.liberado) {
    acao = <Liberado selo={selo} />;
  } else if (trocados.length === 0) {
    acao = (
      <BotaoLiberar enviando={enviando} liberar={liberar} titulo={titulo} />
    );
  } else {
    acao = (
      <ConfirmacaoNaLinha
        botao={{ rotulo: "Liberar mesmo assim" }}
        chave={`liberar:${id}`}
        className="grid basis-full gap-3"
        confirmar={liberar}
        enviando={enviando}
        gatilho={{ nome: `Liberar ${titulo}`, rotulo: "Liberar" }}
        linhaAberta={linhaAberta}
        pergunta={
          <p className={cn(AVISO, "p-3.5")}>
            <TriangleAlert
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-sol"
            />
            <span>
              {para.nome} trocou {lista(trocados.map((c) => c.titulo))} por
              pontos. A trilha passa a cobrir{" "}
              {trocados.length === 1 ? "esse curso" : "esses cursos"}, e os
              pontos não voltam.
            </span>
          </p>
        }
      />
    );
  }
  return <LinhaParaLiberar acao={acao} titulo={titulo} />;
}

function LinhaDoCurso({ c, para }: { c: CursoParaLiberar; para: Para }) {
  const { id, titulo } = c.alvo;
  const { enviando, liberar, selo } = useLiberar(
    para,
    { id, tipo: "curso" },
    titulo
  );
  return (
    <LinhaParaLiberar
      acao={
        c.liberado ? (
          <Liberado selo={selo} />
        ) : (
          <BotaoLiberar enviando={enviando} liberar={liberar} titulo={titulo} />
        )
      }
      selos={
        <>
          {c.emProducao ? (
            <span className={cn(SELO, CONTORNO_NEUTRO)}>Em produção</span>
          ) : null}
          {c.pelaTrilha ? (
            <span
              className={cn(
                SELO,
                "bg-transparent text-ceu ring-1 ring-ceu/60 ring-inset"
              )}
            >
              Já tem pela trilha {c.pelaTrilha}
            </span>
          ) : null}
        </>
      }
      titulo={titulo}
    />
  );
}

export function AcessoDoAluno({ acesso }: { acesso: Acesso }) {
  const [chave, pedir] = useState<string | null>(null);
  const linhaAberta: LinhaAberta = { chave, pedir };
  const { pessoa, userId } = acesso;
  const nome = pessoa?.nome ?? userId;
  const para: Para = { nome, userId };
  const ativas = acesso.liberacoes.filter(
    (l) => l.acao.tipo !== "revogada"
  ).length;

  return (
    <>
      <Link
        className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-full pr-2 font-medium text-muted-foreground text-sm transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ceu focus-visible:outline-solid focus-visible:outline-offset-2"
        href="/admin/alunos"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Alunos
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
            liberacoes={acesso.liberacoes}
            linhaAberta={linhaAberta}
          />
        </Secao>
        {pessoa ? (
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <Secao
              id="liberar-trilha"
              resumo={plural(acesso.trilhas.length, "trilha", "trilhas")}
              titulo="Liberar trilha"
            >
              {acesso.trilhas.length === 0 ? (
                <Vazio>Nenhuma trilha no catálogo.</Vazio>
              ) : (
                <ul className="divide-y divide-border">
                  {acesso.trilhas.map((t) => (
                    <LinhaDaTrilha
                      key={t.alvo.id}
                      linhaAberta={linhaAberta}
                      para={para}
                      t={t}
                    />
                  ))}
                </ul>
              )}
            </Secao>
            <Secao
              id="liberar-curso"
              resumo={plural(acesso.cursos.length, "curso", "cursos")}
              titulo="Liberar curso"
            >
              {acesso.cursos.length === 0 ? (
                <Vazio>Nenhum curso no catálogo.</Vazio>
              ) : (
                <ul className="divide-y divide-border">
                  {acesso.cursos.map((c) => (
                    <LinhaDoCurso c={c} key={c.alvo.id} para={para} />
                  ))}
                </ul>
              )}
            </Secao>
          </div>
        ) : null}
      </div>
    </>
  );
}
