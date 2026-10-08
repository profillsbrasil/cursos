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
import { ArrowLeft, Check, Loader2, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useCallback, useState } from "react";

import { BOTAO, BOTAO_CONTORNO } from "@/components/casca/botoes";
import { fmtData, plural } from "@/lib/formato";
import { useAcao } from "@/lib/use-acao";
import { trpcClient } from "@/utils/trpc";

import { FotoDaPessoa } from "./foto-da-pessoa";
import { CABECA, CELULA, SELO, Secao, Vazio } from "./partes";

const PEQUENO = "h-9 px-3.5 text-[13px]";
const TIPO = { curso: "Curso", trilha: "Trilha" } as const;
const ORIGEM = {
  admin: {
    classe:
      "bg-transparent text-muted-foreground ring-1 ring-muted-foreground ring-inset",
    rotulo: "Admin",
  },
  troca: { classe: "bg-sol/14 text-sol", rotulo: "Troca" },
} as const;
const AVISO =
  "flex gap-2.5 rounded-[14px] bg-sol/10 text-foreground text-sm ring-1 ring-sol/40";

type AlvoNaTela = CursoParaLiberar | TrilhaParaLiberar;

const trocados = (a: AlvoNaTela) =>
  a.alvo.tipo === "trilha" ? (a as TrilhaParaLiberar).trocadosNaTrilha : [];

/** Qual linha está aberta ou enviando: a ação mais o id. */
type Chave = `revogar:${string}` | `liberar:${string}`;

/** O que toda linha recebe da tela. */
interface Momento {
  /** Linha aberta para confirmar. */
  confirmando: Chave | null;
  /** Linha cuja ação está no servidor agora. */
  emCurso: Chave | null;
  pedir: (chave: Chave | null) => void;
  /** Alguma ação da tela está no servidor: todos os botões esperam. */
  pendente: boolean;
}

/** "A", "A e B", "A, B e C". */
const lista = (itens: readonly string[]) =>
  new Intl.ListFormat("pt-BR", { type: "conjunction" }).format(itens);

function Carregando({ ativo }: { ativo: boolean }) {
  return ativo ? (
    <Loader2
      aria-hidden="true"
      className="animate-spin motion-reduce:animate-none"
    />
  ) : null;
}

function AcaoDaLiberacao({
  l,
  momento,
  revogar,
}: {
  l: LiberacaoNaTela;
  momento: Momento;
  revogar: (l: LiberacaoNaTela) => void;
}) {
  const chave: Chave = `revogar:${l.id}`;
  const { pedir, pendente } = momento;
  const abrir = useCallback(() => pedir(chave), [pedir, chave]);
  const fechar = useCallback(() => pedir(null), [pedir]);
  const confirmar = useCallback(() => revogar(l), [revogar, l]);
  const enviando = pendente && momento.emCurso === chave;
  const { acao } = l;
  switch (acao.tipo) {
    case "fixa_por_troca":
      return <span>Troca, não se revoga</span>;
    case "revogada":
      return (
        <span className="tabular-nums">Revogada em {fmtData(acao.em)}</span>
      );
    case "revogar":
      if (!(momento.confirmando === chave || enviando)) {
        return (
          <Button
            aria-label={`Revogar ${l.alvo.titulo}`}
            className={cn(BOTAO_CONTORNO, PEQUENO)}
            disabled={pendente}
            onClick={abrir}
          >
            Revogar
          </Button>
        );
      }
      return (
        <span className="inline-flex flex-wrap items-center justify-end gap-2">
          <span className="text-foreground">Tirar o acesso?</span>
          <Button
            aria-busy={enviando}
            aria-label={`Confirmar: revogar ${l.alvo.titulo}`}
            autoFocus
            className={cn(BOTAO, PEQUENO, "disabled:opacity-100")}
            disabled={pendente}
            focusableWhenDisabled
            onClick={confirmar}
          >
            <Carregando ativo={enviando} />
            Revogar
          </Button>
          <Button
            className={cn(BOTAO_CONTORNO, PEQUENO)}
            disabled={pendente}
            onClick={fechar}
          >
            Cancelar
          </Button>
        </span>
      );
    default:
      return acao satisfies never;
  }
}

function Liberacoes({
  liberacoes,
  momento,
  revogar,
}: {
  liberacoes: readonly LiberacaoNaTela[];
  momento: Momento;
  revogar: (l: LiberacaoNaTela) => void;
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
                <AcaoDaLiberacao l={l} momento={momento} revogar={revogar} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function LinhaParaLiberar({
  a,
  liberar,
  momento,
  nome,
}: {
  a: AlvoNaTela;
  liberar: (a: AlvoNaTela) => void;
  momento: Momento;
  nome: string;
}) {
  const chave: Chave = `liberar:${a.alvo.id}`;
  const { pedir, pendente } = momento;
  const trocadosNaTrilha = trocados(a).map((c) => c.titulo);
  const avisa = trocadosNaTrilha.length > 0;
  const enviando = pendente && momento.emCurso === chave;
  const aberto = momento.confirmando === chave;
  const clicar = useCallback(
    () => (avisa ? pedir(chave) : liberar(a)),
    [avisa, pedir, chave, liberar, a]
  );
  const confirmar = useCallback(() => liberar(a), [liberar, a]);
  const fechar = useCallback(() => pedir(null), [pedir]);
  const avisoId = `aviso-${a.alvo.id}`;

  let acao: ReactNode = null;
  if (a.liberado) {
    acao = (
      <span className={cn(SELO, "gap-1 bg-ceu/14 text-ceu")}>
        <Check aria-hidden="true" className="size-3.5" strokeWidth={2.4} />
        Liberado
      </span>
    );
  } else if (!aberto) {
    acao = (
      <Button
        aria-busy={enviando}
        aria-label={`Liberar ${a.alvo.titulo}`}
        className={cn(BOTAO_CONTORNO, PEQUENO, "disabled:opacity-100")}
        disabled={pendente}
        focusableWhenDisabled
        onClick={clicar}
      >
        <Carregando ativo={enviando} />
        Liberar
      </Button>
    );
  }

  return (
    <li className="grid gap-3 px-5 py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <span className="min-w-0 font-medium text-foreground">
          {a.alvo.titulo}
        </span>
        {acao}
      </div>
      {aberto && !a.liberado ? (
        <fieldset aria-labelledby={avisoId} className="grid min-w-0 gap-3">
          <p className={cn(AVISO, "p-3.5")} id={avisoId}>
            <TriangleAlert
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-sol"
            />
            <span>
              {nome} trocou {lista(trocadosNaTrilha)} por pontos. A trilha passa
              a cobrir{" "}
              {trocadosNaTrilha.length === 1 ? "esse curso" : "esses cursos"}, e
              os pontos não voltam.
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              aria-busy={enviando}
              autoFocus
              className={cn(BOTAO, PEQUENO, "disabled:opacity-100")}
              disabled={pendente}
              focusableWhenDisabled
              onClick={confirmar}
            >
              <Carregando ativo={enviando} />
              Liberar mesmo assim
            </Button>
            <Button
              className={cn(BOTAO_CONTORNO, PEQUENO)}
              disabled={pendente}
              onClick={fechar}
            >
              Cancelar
            </Button>
          </div>
        </fieldset>
      ) : null}
    </li>
  );
}

function ParaLiberar({
  alvos,
  liberar,
  momento,
  nome,
  vazio,
}: {
  alvos: readonly AlvoNaTela[];
  liberar: (a: AlvoNaTela) => void;
  momento: Momento;
  nome: string;
  vazio: string;
}) {
  if (alvos.length === 0) {
    return <Vazio>{vazio}</Vazio>;
  }
  return (
    <ul className="divide-y divide-border">
      {alvos.map((a) => (
        <LinhaParaLiberar
          a={a}
          key={a.alvo.id}
          liberar={liberar}
          momento={momento}
          nome={nome}
        />
      ))}
    </ul>
  );
}

// Depois da ação o botão some ou muda de lugar: o foco vai para o título da lista.
const focarLiberacoes = () => document.getElementById("liberacoes")?.focus();

export function AcessoDoAluno({ acesso }: { acesso: Acesso }) {
  const { executar, pendente } = useAcao();
  const [confirmando, setConfirmando] = useState<Chave | null>(null);
  const [emCurso, setEmCurso] = useState<Chave | null>(null);
  const { pessoa, userId } = acesso;
  const nome = pessoa?.nome ?? userId;

  const depois = useCallback(() => {
    setConfirmando(null);
    focarLiberacoes();
  }, []);

  const liberar = useCallback(
    (a: AlvoNaTela) => {
      setEmCurso(`liberar:${a.alvo.id}`);
      executar(
        () =>
          trpcClient.admin.alunos.liberar.mutate({
            alvo:
              a.alvo.tipo === "trilha"
                ? {
                    id: a.alvo.id,
                    tipo: "trilha",
                    trocadosVistos: trocados(a).map((c) => c.id),
                  }
                : { id: a.alvo.id, tipo: "curso" },
            userId,
          }),
        { depois, sucesso: `Acesso a ${a.alvo.titulo} liberado para ${nome}.` }
      );
    },
    [executar, depois, userId, nome]
  );

  const revogar = useCallback(
    (l: LiberacaoNaTela) => {
      setEmCurso(`revogar:${l.id}`);
      executar(
        () => trpcClient.admin.alunos.revogar.mutate({ liberacaoId: l.id }),
        { depois, sucesso: `Acesso a ${l.alvo.titulo} revogado.` }
      );
    },
    [executar, depois]
  );

  const ativas = acesso.liberacoes.filter(
    (l) => l.acao.tipo !== "revogada"
  ).length;
  const momento: Momento = {
    confirmando,
    emCurso,
    pedir: setConfirmando,
    pendente,
  };

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
            momento={momento}
            revogar={revogar}
          />
        </Secao>
        {pessoa ? (
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <Secao
              id="liberar-trilha"
              resumo={plural(acesso.trilhas.length, "trilha", "trilhas")}
              titulo="Liberar trilha"
            >
              <ParaLiberar
                alvos={acesso.trilhas}
                liberar={liberar}
                momento={momento}
                nome={nome}
                vazio="Nenhuma trilha no catálogo."
              />
            </Secao>
            <Secao
              id="liberar-curso"
              resumo={plural(acesso.cursos.length, "curso", "cursos")}
              titulo="Liberar curso"
            >
              <ParaLiberar
                alvos={acesso.cursos}
                liberar={liberar}
                momento={momento}
                nome={nome}
                vazio="Nenhum curso no catálogo."
              />
            </Secao>
          </div>
        ) : null}
      </div>
    </>
  );
}
