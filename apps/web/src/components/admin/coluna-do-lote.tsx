"use client";

import type { CursoNaVisao } from "@cursos/api/dominio/catalogo";
import type { DiaISO, Pessoa } from "@cursos/api/dominio/tipos";
import { Button } from "@cursos/ui/components/button";
import { cn } from "@cursos/ui/lib/utils";
import { Check, CircleAlert, Plus, RotateCcw, X } from "lucide-react";
import Image from "next/image";
import { useCallback } from "react";
import { flushSync } from "react-dom";

import { BOTAO, BOTAO_CONTORNO, PEQUENO } from "@/components/casca/botoes";
import { fmtNum, plural } from "@/lib/formato";
import { useAcao } from "@/lib/use-acao";
import { trpcClient } from "@/utils/trpc";

import { type Selo, SeloDeSituacao } from "./acompanhamento";
import { Carregando } from "./confirmacao-na-linha";
import { FotoDaPessoa } from "./foto-da-pessoa";
import {
  avisoDoTeto,
  type CursoDoLote,
  detalheDoResultado,
  type EventoDoLote,
  emOrdemDoResultado,
  type FaseDoLote,
  type LinhaDoResultado,
  prontoParaLiberar,
  resumoDoResultado,
  rotuloDoLiberar,
} from "./lote";
import { ICONE, NAO_PODE } from "./partes";
import { useLote } from "./provedor-do-lote";

const TITULO = "lote";
const idDoX = (userId: string) => `lote-desmarcar-${userId}`;
const idDoResultado = (userId: string) => `lote-resultado-${userId}`;

const CARTAO =
  "grid gap-4 rounded-[20px] bg-card p-5 ring-1 ring-border @min-[47.5rem]:sticky @min-[47.5rem]:top-4";
const TITULO_DA_COLUNA =
  "flex items-baseline justify-between gap-2.5 font-semibold text-lg text-titulo leading-[1.3]";

const ERRO = "Não deu para liberar. Tente de novo em instantes.";

function useDespacharEFocar() {
  const { despachar } = useLote();
  return useCallback(
    (evento: EventoDoLote, alvo: string) => {
      flushSync(() => despachar(evento));
      document.getElementById(alvo)?.focus();
    },
    [despachar]
  );
}

const SELO_DO_RESULTADO: Record<LinhaDoResultado["liberacao"]["tipo"], Selo> = {
  ja_tinha: {
    classe: "bg-popover text-foreground",
    icone: Check,
    rotulo: "Já tinha",
  },
  liberada_agora: {
    classe: "bg-ceu text-sobre-cor",
    icone: Check,
    rotulo: "Liberada agora",
  },
  nao_liberou: {
    classe:
      "bg-transparent text-destructive ring-1 ring-destructive ring-inset",
    icone: CircleAlert,
    rotulo: "Não liberou",
  },
};

function LinhaNoResultado({
  curso,
  hoje,
  l,
}: {
  curso: CursoDoLote;
  hoje: DiaISO;
  l: LinhaDoResultado;
}) {
  const { executar, pendente } = useAcao();
  const despacharEFocar = useDespacharEFocar();
  const { liberacao, pessoa } = l;
  const repetir = useCallback(
    () =>
      executar(
        () =>
          trpcClient.admin.alunos.liberarVarios.mutate({
            cursoId: curso.id,
            userIds: [pessoa.userId],
          }),
        {
          depois: (resultado) =>
            despacharEFocar(
              { resultado, tipo: "repetiu" },
              idDoResultado(pessoa.userId)
            ),
          erro: ERRO,
        }
      ),
    [executar, despacharEFocar, curso.id, pessoa.userId]
  );
  return (
    <li className="grid @min-[28.75rem]:grid-cols-[2.25rem_minmax(0,1fr)_auto] grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-x-3.5 gap-y-1 py-3">
      <FotoDaPessoa className="size-9" foto={pessoa.foto} nome={pessoa.nome} />
      <span className="min-w-0">
        <strong className="block truncate font-medium text-foreground text-sm">
          {pessoa.nome}
        </strong>
        <small className="block text-muted-foreground text-xs">
          {detalheDoResultado(l, hoje)}
        </small>
      </span>
      <span
        className="@min-[28.75rem]:col-start-3 col-start-2 flex flex-wrap items-center @min-[28.75rem]:justify-end gap-2"
        id={idDoResultado(pessoa.userId)}
        tabIndex={-1}
      >
        <SeloDeSituacao selo={SELO_DO_RESULTADO[liberacao.tipo]} />
        {liberacao.tipo === "nao_liberou" ? (
          <Button
            aria-busy={pendente}
            aria-label={`Tentar de novo para ${pessoa.nome}`}
            className={cn(BOTAO_CONTORNO, PEQUENO)}
            disabled={pendente}
            focusableWhenDisabled
            onClick={repetir}
          >
            {pendente ? <Carregando ativo /> : <RotateCcw aria-hidden="true" />}
            Tentar de novo
          </Button>
        ) : null}
      </span>
    </li>
  );
}

function Resultado({
  className,
  fase,
}: {
  className?: string;
  fase: Extract<FaseDoLote, { tipo: "resultado" }>;
}) {
  const despacharEFocar = useDespacharEFocar();
  const nova = useCallback(
    () => despacharEFocar({ tipo: "nova_liberacao" }, TITULO),
    [despacharEFocar]
  );
  return (
    <aside aria-labelledby={TITULO} className={cn(CARTAO, className)}>
      <h2 className={TITULO_DA_COLUNA} id={TITULO} tabIndex={-1}>
        Liberado
      </h2>
      <p className="-mt-2.5 text-sm">
        <b className="font-semibold text-foreground">{fase.curso.titulo}</b>
        <br />
        <span className="text-muted-foreground tabular-nums" role="status">
          {resumoDoResultado(fase.linhas)}
        </span>
      </p>
      <ul className="@container -mt-2 divide-y divide-border">
        {emOrdemDoResultado(fase.linhas).map((l) => (
          <LinhaNoResultado
            curso={fase.curso}
            hoje={fase.hoje}
            key={l.pessoa.userId}
            l={l}
          />
        ))}
      </ul>
      <Button className={BOTAO_CONTORNO} onClick={nova}>
        <Plus aria-hidden="true" />
        Nova liberação
      </Button>
    </aside>
  );
}

function Marcada({ p, vizinha }: { p: Pessoa; vizinha: Pessoa | undefined }) {
  const despacharEFocar = useDespacharEFocar();
  const desmarcar = useCallback(
    () =>
      despacharEFocar(
        { tipo: "desmarcar", userId: p.userId },
        vizinha ? idDoX(vizinha.userId) : TITULO
      ),
    [despacharEFocar, p.userId, vizinha]
  );
  return (
    <li className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2.5 px-2 py-1">
      <FotoDaPessoa
        className="size-8 [&_[data-slot=avatar-fallback]]:text-xs"
        foto={p.foto}
        nome={p.nome}
      />
      <span className="min-w-0">
        <strong className="block truncate font-medium text-[13px] text-foreground">
          {p.nome}
        </strong>
        <small className="block truncate text-muted-foreground text-xs">
          {p.email ?? p.userId}
        </small>
      </span>
      <Button
        aria-label={`Desmarcar ${p.nome}`}
        className={ICONE}
        id={idDoX(p.userId)}
        onClick={desmarcar}
      >
        <X aria-hidden="true" />
      </Button>
    </li>
  );
}

function Marcadas() {
  const { estado } = useLote();
  const despacharEFocar = useDespacharEFocar();
  const desmarcarTodas = useCallback(
    () => despacharEFocar({ tipo: "desmarcar_todas" }, TITULO),
    [despacharEFocar]
  );
  const { marcadas } = estado;
  if (marcadas.length === 0) {
    return (
      <p className="text-pretty text-[13px] text-muted-foreground">
        Marque as pessoas na lista. Quem você marcar fica aqui, mesmo depois de
        outra busca.
      </p>
    );
  }
  return (
    <>
      <ul className="-mx-2 -mt-1 grid max-h-[220px] overflow-auto">
        {marcadas.map((p, i) => (
          <Marcada
            key={p.userId}
            p={p}
            vizinha={marcadas[i + 1] ?? marcadas[i - 1]}
          />
        ))}
      </ul>
      {marcadas.length > 1 ? (
        <button
          className="justify-self-start rounded-md p-0.5 font-semibold text-[13px] text-ceu transition-colors hover:text-titulo"
          onClick={desmarcarTodas}
          type="button"
        >
          Desmarcar todas
        </button>
      ) : null}
    </>
  );
}

function OpcaoDeCurso({
  c,
  escolhido,
}: {
  c: CursoNaVisao;
  escolhido: boolean;
}) {
  const { despachar } = useLote();
  const escolher = useCallback(
    () =>
      despachar({ curso: { id: c.id, titulo: c.titulo }, tipo: "escolher" }),
    [despachar, c.id, c.titulo]
  );
  return (
    <label className="grid cursor-pointer grid-cols-[18px_44px_minmax(0,1fr)] items-center gap-2.5 rounded-[12px] px-2 py-1.5 transition-colors hover:bg-white/8 has-checked:bg-sol/14">
      <input
        checked={escolhido}
        className="m-0 size-[18px] cursor-pointer appearance-none rounded-full border-[1.5px] border-muted-foreground checked:border-[5px] checked:border-sol"
        name="curso-do-lote"
        onChange={escolher}
        type="radio"
        value={c.id}
      />
      <span className="relative h-[30px] w-11 overflow-hidden rounded-[8px] ring-1 ring-border">
        <Image
          alt=""
          className="object-cover"
          fill
          sizes="44px"
          src={c.capa.url}
        />
      </span>
      <span className="text-[13px] text-foreground leading-[1.3]">
        {c.titulo}
        <small className="block text-muted-foreground text-xs">
          {c.status === "em_producao"
            ? "Em produção"
            : plural(c.aulas, "aula", "aulas")}
        </small>
      </span>
    </label>
  );
}

function Cursos({ cursos }: { cursos: readonly CursoNaVisao[] }) {
  const { estado } = useLote();
  const escolhido =
    estado.fase.tipo === "marcando" ? estado.fase.curso?.id : undefined;
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 font-semibold text-[13px] text-foreground">
        Curso
      </legend>
      <div className="-mx-2 grid max-h-[250px] gap-0.5 overflow-auto p-0.5">
        {cursos.map((c) => (
          <OpcaoDeCurso c={c} escolhido={escolhido === c.id} key={c.id} />
        ))}
      </div>
    </fieldset>
  );
}

function Formulario({
  className,
  cursos,
}: {
  className?: string;
  cursos: readonly CursoNaVisao[];
}) {
  const { estado } = useLote();
  const { executar, pendente } = useAcao();
  const despacharEFocar = useDespacharEFocar();
  const pronto = prontoParaLiberar(estado);
  const n = estado.marcadas.length;
  const liberar = useCallback(() => {
    if (pronto.tipo !== "pronto") {
      return;
    }
    const { curso, pessoas } = pronto;
    executar(
      () =>
        trpcClient.admin.alunos.liberarVarios.mutate({
          cursoId: curso.id,
          userIds: pessoas.map((p) => p.userId),
        }),
      {
        depois: (resultado) =>
          despacharEFocar(
            { curso, enviadas: pessoas, resultado, tipo: "liberou" },
            TITULO
          ),
        erro: ERRO,
      }
    );
  }, [pronto, executar, despacharEFocar]);
  return (
    <aside aria-labelledby={TITULO} className={cn(CARTAO, className)}>
      <h2 className={TITULO_DA_COLUNA} id={TITULO} tabIndex={-1}>
        Marcadas
        <small className="font-medium text-[13px] text-muted-foreground tabular-nums">
          {fmtNum(n)}
        </small>
      </h2>
      <Marcadas />
      <Cursos cursos={cursos} />
      <Button
        aria-busy={pendente}
        aria-describedby={
          pronto.tipo === "passou_do_teto" ? "lote-teto" : undefined
        }
        className={cn(
          BOTAO,
          "w-full",
          NAO_PODE,
          "data-disabled:hover:bg-sol data-disabled:hover:shadow-none"
        )}
        disabled={pronto.tipo !== "pronto" || pendente}
        focusableWhenDisabled
        onClick={liberar}
      >
        <Carregando ativo={pendente} />
        {rotuloDoLiberar(n)}
      </Button>
      {pronto.tipo === "passou_do_teto" ? (
        <p className="-mt-2 text-[13px] text-muted-foreground" id="lote-teto">
          {avisoDoTeto(pronto.sobram)}
        </p>
      ) : null}
    </aside>
  );
}

export function ColunaDoLote({
  className,
  cursos,
}: {
  className?: string;
  cursos: readonly CursoNaVisao[];
}) {
  const { estado } = useLote();
  return estado.fase.tipo === "resultado" ? (
    <Resultado className={className} fase={estado.fase} />
  ) : (
    <Formulario className={className} cursos={cursos} />
  );
}
